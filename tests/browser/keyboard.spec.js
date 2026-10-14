import { test, expect } from '@playwright/test';
import { mockAccount } from './account-fixture.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  await mockAccount(page);
  // Chromium cannot open an iOS keyboard. Model Safari's smaller visual viewport
  // while keeping its layout viewport unchanged.
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    viewport.height = innerHeight;
    viewport.offsetTop = 0;
    viewport.scale = 1;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    window.testKeyboard = (height, offsetTop = 0) => {
      viewport.height = height;
      viewport.offsetTop = offsetTop;
      viewport.dispatchEvent(new Event('resize'));
    };
  });
});

test('mobile form controls stay readable and quest sheets fit above the keyboard', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  const sheet = page.getByRole('dialog');
  const title = sheet.getByRole('textbox', { name: 'Task', exact: true });
  await title.focus();
  await expect(title).toHaveCSS('font-size', '16px');

  await page.evaluate(() => window.testKeyboard(360));
  await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  const sheetBox = await sheet.boundingBox();
  expect(sheetBox.y).toBeGreaterThanOrEqual(0);
  expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(361);

  await page.evaluate(() => window.testKeyboard(360, 40));
  await expect(sheet).toHaveCSS('top', '48px');
  await page.evaluate(() => window.testKeyboard(360));

  await title.fill('Type with the keyboard open');
  await sheet.getByRole('button', { name: 'Add task', exact: true }).scrollIntoViewIfNeeded();
  const saveBox = await sheet.getByRole('button', { name: 'Add task', exact: true }).boundingBox();
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(361);
  await sheet.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.evaluate(() => window.testKeyboard(innerHeight));
  await expect(page.locator('html')).not.toHaveAttribute('data-keyboard-open');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await sheet.getByRole('textbox', { name: 'Task', exact: true }).focus();
  await page.evaluate(() => window.testKeyboard(260));
  await expect(sheet).toHaveCSS('max-height', '244px');
  await sheet.getByRole('button', { name: 'Cancel' }).scrollIntoViewIfNeeded();
  const cancelBox = await sheet.getByRole('button', { name: 'Cancel' }).boundingBox();
  expect(cancelBox.y + cancelBox.height).toBeLessThanOrEqual(261);
});

test('search, settings, and account inputs retain usable text sizes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Search quests' }).click();
  await expect(page.getByRole('textbox', { name: 'Search quests' })).toHaveCSS('font-size', '16px');
  await page.evaluate(() => window.testKeyboard(390));
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  await page.getByRole('link', { name: 'Open settings' }).click();
  await page.evaluate(() => window.testKeyboard(innerHeight));
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveCSS('font-size', '16px');
  await expect(page.getByLabel('Timezone')).toHaveCSS('font-size', '16px');
  await page.getByLabel('Your name', { exact: true }).focus();
  await page.evaluate(() => window.testKeyboard(390));
  await expect(page.locator('.app-layout')).toHaveCSS('height', '390px');
  await page.getByRole('button', { name: 'Save changes' }).scrollIntoViewIfNeeded();
  const saveBox = await page.getByRole('button', { name: 'Save changes' }).boundingBox();
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(391);

  await page.route('**/api/auth/get-session', (route) => route.fulfill({ json: null }));
  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveCSS('font-size', '16px');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCSS('font-size', '16px');
});
