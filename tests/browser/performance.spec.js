import { test, expect } from '@playwright/test';
import { createGame, applyAction } from '../../shared/game.js';

test('theme, pets, care, and quests respond before slow cloud saves; tokens are reused', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let server = createGame(),
    version = 0,
    tokenCalls = 0;
  const operations = [],
    ledger = new Map();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'speed-qa', exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      json: { user: { id: 'speed-qa', name: 'Speed QA', email: 'speed@example.invalid' } },
    }),
  );
  await page.route('**/api/auth/token', (route) => {
    tokenCalls++;
    return route.fulfill({ json: { token } });
  });
  await page.route('**/api/game', async (route) => {
    if (route.request().method() === 'POST') {
      const action = route.request().postDataJSON();
      operations.push(action);
      await gate;
      if (!ledger.has(action.id)) {
        const result = applyAction(server, action);
        server = result.state;
        version++;
        ledger.set(action.id, result.message);
      }
      return route.fulfill({ json: { state: server, version, message: ledger.get(action.id) } });
    }
    return route.fulfill({ json: { state: server, version } });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', { timeout: 300 });
  await expect.poll(() => operations.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', { timeout: 300 });
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await page.getByRole('link', { name: 'Pets', exact: true }).click();
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Pip, Dog', exact: true }).click();
  await expect(page.locator('.pet-scene-labels>strong')).toContainText('Pip', { timeout: 300 });
  await page.getByRole('button', { name: 'Choose Chami, Cat', exact: true }).click();
  await expect(page.locator('.pet-scene-labels>strong')).toContainText('Chami', { timeout: 300 });
  await page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  await expect(page.locator('.scene-companion .sprite-pet')).toHaveAttribute(
    'data-mood',
    'eating',
    { timeout: 300 },
  );
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Make space for one important thing', exact: true })
    .click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('80', { timeout: 300 });
  expect(server.coins).toBe(60);
  expect(server.pet.species).toBe('cat');
  release();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('pocketquest-cloud-v2:speed-qa')).queue.length,
      ),
    )
    .toBe(0);
  expect(server.settings.theme).toBe('dark');
  expect(server.pet.name).toBe('Chami');
  expect(server.coins).toBe(80);
  expect(server.inventory.berry).toBe(1);
  expect(server.careCount).toBe(1);
  expect(tokenCalls).toBe(1);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.wallet-pill strong')).toHaveText('80');
});
