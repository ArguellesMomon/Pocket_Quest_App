import { test, expect } from '@playwright/test';
import { mockAccount } from './account-fixture.js';
test('installed account adventure reloads and queues rewards offline', async ({
  page,
  context,
}) => {
  test.skip(process.env.RUN_PWA_E2E !== '1', 'Requires a production preview at port 4175.');
  await mockAccount(page, context);
  await page.goto('http://127.0.0.1:4175/dashboard');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // A freshly installed worker controls the next navigation in prompt-update mode.
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Complete Make space for one important thing', exact: true })
    .click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('80');
  expect(await page.evaluate(() => fetch('/companions/mochi.webp').then((r) => r.ok))).toBe(true);
  for (const asset of [
    '/backgrounds/daydream.webp',
    '/backgrounds/sunset.webp',
    '/items/berry.webp',
    '/items/salmon.webp',
    '/companions/chami.webp',
    '/companions/chami-idle.webp',
  ])
    expect(await page.evaluate((asset) => fetch(asset).then((r) => r.ok), asset)).toBe(true);
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('.wallet-pill strong')).toHaveText('80');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await context.setOffline(false);
});
