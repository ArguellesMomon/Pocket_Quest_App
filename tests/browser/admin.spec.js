import { test, expect } from '@playwright/test';
import { createGame } from '../../shared/game.js';
import { applyTestValues } from '../../server/admin-store.js';

async function account(
  page,
  context,
  { admin = true, lostResponse = false, conflict = false } = {},
) {
  let state = createGame(),
    version = 1,
    fail = lostResponse,
    stale = conflict;
  const requests = [],
    operations = new Set();
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'admin-ui', exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await context.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      json: {
        user: {
          id: 'admin-ui',
          name: 'Admin',
          email: admin ? 'admin@pocket.com' : 'ordinary@example.com',
        },
      },
    }),
  );
  await context.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  await context.route('**/api/game', (route) => route.fulfill({ json: { state, version, admin } }));
  await context.route('**/api/admin', (route) => {
    if (!admin)
      return route.fulfill({
        status: 403,
        json: { error: 'This account does not have test admin access.' },
      });
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      requests.push(body);
      if (stale) {
        stale = false;
        state.coins += 20;
        version++;
        return route.fulfill({
          status: 409,
          json: { error: 'Progress changed. Reload the test values before saving.' },
        });
      }
      if (!operations.has(body.id)) {
        state = applyTestValues(state, body.values);
        version++;
        operations.add(body.id);
      }
      if (fail) {
        fail = false;
        return route.fulfill({
          status: 503,
          json: { error: 'Temporarily unavailable. Try again.' },
        });
      }
    }
    return route.fulfill({ json: { state, version } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
  return requests;
}
test('admin changes coins, XP and pet moods, syncs across pages and fits mobile dark mode', async ({
  page,
  context,
}) => {
  const requests = await account(page, context);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Test controls', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Coins', exact: true }).fill('5000');
  await page.getByRole('spinbutton', { name: 'Points / XP' }).fill('450');
  await page.getByRole('combobox', { name: 'Companion', exact: true }).selectOption('samo');
  await page.getByRole('button', { name: 'Sleepy', exact: true }).click();
  await expect(page.getByText('Level 4 · Sleepy', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save test values', exact: true }).click();
  await expect(page.getByText('Test progress saved.', { exact: true })).toBeVisible();
  expect(requests[0].values).toEqual({
    coins: 5000,
    xp: 450,
    species: 'samo',
    energy: 20,
    joy: 70,
  });
  await expect(page.locator('.wallet-pill')).toContainText('5000');
  // Isolate visual QA from unrelated theme save commands.
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('.main-content').scrollTop = 0;
  });
  await page.screenshot({ path: 'docs/previews/admin-mobile-dark.png', animations: 'disabled' });
  await page.getByRole('link', { name: 'Back to Today' }).click();
  await expect(page.locator('.wallet-pill')).toContainText('5000');
  await page.goto('/admin');
  await expect(page.getByRole('spinbutton', { name: 'Coins', exact: true })).toHaveValue('5000');
  await expect(page.getByRole('combobox', { name: 'Companion', exact: true })).toHaveValue('samo');
});
test('ordinary accounts cannot open admin controls even with a direct URL', async ({
  page,
  context,
}) => {
  await account(page, context, { admin: false });
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Test controls' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByRole('alert')).toContainText('does not have test admin access');
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
});
test('uncertain saves keep the same ID and cannot be edited before retry', async ({
  page,
  context,
}) => {
  const requests = await account(page, context, { lostResponse: true });
  await page.goto('/admin');
  await page.getByRole('button', { name: '+1,000 coins', exact: true }).click();
  await page.getByRole('button', { name: 'Save test values', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable');
  await expect(page.getByRole('spinbutton', { name: 'Coins', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Test progress saved.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  await expect(page.getByRole('spinbutton', { name: 'Coins', exact: true })).toHaveValue('1060');
});
test('conflicting progress requires a reload instead of overwriting fresh rewards', async ({
  page,
  context,
}) => {
  await account(page, context, { conflict: true });
  await page.goto('/admin');
  await page.getByRole('button', { name: '+1,000 coins', exact: true }).click();
  await page.getByRole('button', { name: 'Save test values', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Progress changed');
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Coins', exact: true })).toHaveValue('80');
});
