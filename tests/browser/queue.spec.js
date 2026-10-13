import { test, expect } from '@playwright/test';
import { createGame, applyAction } from '../../shared/game.js';
import { createSnapshot, enqueue } from '../../shared/outbox.js';

async function fakeCloud(context, owner) {
  const data = { state: createGame(), version: 0, ledger: new Map(), posts: [], gate: null };
  const token = `e30.${Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await context.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user: { id: owner, name: 'QA', email: 'queue@example.invalid' } } }),
  );
  await context.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  await context.route('**/api/game', async (route) => {
    if (route.request().method() === 'POST') {
      const action = route.request().postDataJSON();
      data.posts.push(action);
      if (data.gate) await data.gate;
      if (!data.ledger.has(action.id)) {
        const result = applyAction(data.state, action);
        data.state = result.state;
        data.version++;
        data.ledger.set(action.id, result.message);
      }
      return route.fulfill({
        json: { state: data.state, version: data.version, message: data.ledger.get(action.id) },
      });
    }
    return route.fulfill({ json: { state: data.state, version: data.version } });
  });
  return data;
}
test('two tabs append during a save without losing commands or consuming inventory twice', async ({
  page,
  context,
}) => {
  const data = await fakeCloud(context, 'tabs-qa');
  let release;
  data.gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/dashboard');
  await expect(other.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page.bringToFront();
  await page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  await expect.poll(() => data.posts.length).toBe(1);
  await other.bringToFront();
  await expect(
    other
      .getByRole('button', { name: 'Feed companion a berry bite', exact: true })
      .locator('small'),
  ).toHaveText('×1');
  await other.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  await expect(
    other.getByRole('button', { name: 'Buy and feed a berry bite for 15 coins', exact: true }),
  ).toBeVisible();
  release();
  await expect
    .poll(() =>
      other.evaluate(
        () => JSON.parse(localStorage.getItem('pocketquest-cloud-v2:tabs-qa')).queue.length,
      ),
    )
    .toBe(0);
  expect(data.state.inventory.berry).toBe(0);
  expect(data.state.careCount).toBe(2);
  expect(data.state.coins).toBe(60);
  expect(data.posts.length).toBe(2);
  expect(new Set(data.posts.map((action) => action.id)).size).toBe(2);
  await other.close();
});
test('legacy pending IDs migrate by confirmation before adopting a server snapshot', async ({
  page,
  context,
}) => {
  const data = await fakeCloud(context, 'legacy-qa');
  const action = { id: crypto.randomUUID(), type: 'item.care', itemId: 'berry' };
  const committed = applyAction(data.state, action);
  data.state = committed.state;
  data.version = 1;
  data.ledger.set(action.id, committed.message);
  await page.addInitScript((action) => {
    sessionStorage.setItem('pocketquest-pending:legacy-qa', JSON.stringify(action));
  }, action);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).locator('small'),
  ).toHaveText('×1');
  expect(await page.evaluate(() => sessionStorage.getItem('pocketquest-pending:legacy-qa'))).toBe(
    null,
  );
  expect(data.posts.length).toBe(1);
  expect(data.posts[0].id).toBe(action.id);
  expect(data.state.careCount).toBe(1);
});
test('cached account controls work offline and resume saving after the online event', async ({
  page,
  context,
}) => {
  const data = await fakeCloud(context, 'offline-qa');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page.addInitScript(() => {
    window.qaOnline = false;
    Object.defineProperty(navigator, 'onLine', { get: () => window.qaOnline, configurable: true });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', { timeout: 300 });
  expect(data.posts.length).toBe(0);
  await page.evaluate(() => {
    window.qaOnline = true;
    window.dispatchEvent(new Event('online'));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('pocketquest-cloud-v2:offline-qa')).queue.length,
      ),
    )
    .toBe(0);
  expect(data.state.settings.theme).toBe('dark');
});
test('cached commands are never submitted under a different signed-in account', async ({
  page,
  context,
}) => {
  const data = await fakeCloud(context, 'new-owner');
  const snapshot = enqueue(createSnapshot({ state: createGame(), version: 0 }), {
    id: crypto.randomUUID(),
    type: 'task.complete',
    taskId: 'starter-1',
  }).snapshot;
  await page.addInitScript((snapshot) => {
    localStorage.setItem('pocketquest-cloud-v2:old-owner', JSON.stringify(snapshot));
    sessionStorage.setItem(
      'pocketquest-account-v2',
      JSON.stringify({ id: 'old-owner', name: 'Previous account', email: 'old@example.invalid' }),
    );
  }, snapshot);
  await page.goto('/dashboard');
  await expect(page.locator('.wallet-pill strong')).toHaveText('60');
  expect(data.posts.length).toBe(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pocketquest-cloud-v2:old-owner')).queue.length,
    ),
  ).toBe(1);
});
