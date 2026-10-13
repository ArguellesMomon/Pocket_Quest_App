import { test, expect } from '@playwright/test';
import { createGame } from '../../shared/game.js';
test('server rejection rolls back purchases and removes unaffordable dependent commands', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const server = createGame();
  server.coins = 500;
  server.xp = 450;
  let version = 0,
    posts = 0,
    release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'rollback-qa', exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      json: { user: { id: 'rollback-qa', name: 'QA', email: 'rollback@example.invalid' } },
    }),
  );
  await page.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  await page.route('**/api/game', async (route) => {
    if (route.request().method() === 'POST') {
      posts++;
      await gate;
      server.coins = 0;
      version = 1;
      return route.fulfill({ status: 400, json: { error: 'You need more coins.' } });
    }
    return route.fulfill({ json: { state: server, version } });
  });
  await page.goto('/market?tab=room');
  await page.getByRole('button', { name: 'Buy Little fern for 60 coins', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove Little fern', exact: true })).toBeVisible();
  await expect.poll(() => posts).toBe(1);
  await page.getByRole('button', { name: 'Buy Firefly lantern for 90 coins', exact: true }).click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('350');
  release();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const snapshot = JSON.parse(localStorage.getItem('pocketquest-cloud-v2:rollback-qa'));
        return snapshot.queue.length === 0 && !snapshot.refresh;
      }),
    )
    .toBe(true);
  await expect(page.locator('.wallet-pill strong')).toHaveText('0');
  await expect(
    page.getByRole('button', { name: 'Buy Little fern for 60 coins', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Buy Firefly lantern for 90 coins', exact: true }),
  ).toBeDisabled();
  expect(posts).toBe(1);
});
