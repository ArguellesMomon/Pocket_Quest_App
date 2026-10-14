import { test, expect } from '@playwright/test';
import { mockAccount } from './account-fixture.js';
import { createGame } from '../../shared/game.js';

test('welcome and login have one account path, fit phones, and ignore legacy guest saves', async ({
  page,
  context,
}) => {
  await mockAccount(page, context, { signedIn: false });
  await page.addInitScript(
    (game) => localStorage.setItem('pocketquest-guest-v1', JSON.stringify(game)),
    createGame(),
  );
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Get started', exact: true })).toBeInViewport();
    await expect(page.getByText(/guest/i)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/previews/welcome-${size.width}.png`,
      animations: 'disabled',
    });
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('form > button[type="submit"]')).toBeInViewport();
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await page.screenshot({
      path: `docs/previews/login-${size.width}.png`,
      animations: 'disabled',
    });
    await page.goto('/login?mode=signup');
    await expect(page.locator('form > button[type="submit"]')).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: `docs/previews/signup-${size.width}.png`,
      animations: 'disabled',
    });
  }
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Create account', exact: true }).first(),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Your name', exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const route of ['/', '/login', '/login?mode=signup']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/previews/auth-${route === '/' ? 'welcome' : route.includes('?') ? 'signup' : 'login'}-dark.png`,
      animations: 'disabled',
    });
  }
});
test('friendly account form signs in, shows password only on request, handles errors and signs out cleanly', async ({
  page,
  context,
}) => {
  const data = await mockAccount(page, context, { signedIn: false });
  await page.goto('/login');
  await page
    .getByRole('textbox', { name: 'Email address', exact: true })
    .fill('design@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  data.failAuth = true;
  await page.locator('form > button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  data.failAuth = false;
  await page.locator('form > button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Get started', exact: true })).toBeVisible();
  await expect(page.getByText(/guest/i)).toHaveCount(0);
});
test('all app screens fit phones and desktop in both themes with a task-first Today', async ({
  page,
  context,
}) => {
  await mockAccount(page, context);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const theme of ['light', 'dark']) {
    await page.goto('/settings');
    await page.getByRole('button', { name: theme, exact: true }).click();
    for (const size of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(size);
      for (const route of [
        '/dashboard',
        '/quests',
        '/habitat',
        '/market',
        '/journey',
        '/settings',
        '/settings?tab=sounds',
        '/settings?tab=profile',
        '/settings?tab=account',
      ]) {
        await page.goto(route);
        await expect(page.locator('h1')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
        ).toBe(true);
        if (route === '/dashboard')
          await expect(page.getByRole('button', { name: /^Complete Make space/ })).toBeInViewport();
        if (size.width === 390 || size.width === 1440)
          await page.screenshot({
            path: `docs/previews/refresh-${route.replace(/[^a-z]/g, '-')}-${size.width}-${theme}.png`,
            animations: 'disabled',
          });
      }
    }
  }
  expect(errors).toEqual([]);
});
test('task creation keeps daily repetition one tap away and rewards the completed task', async ({
  page,
  context,
}) => {
  const data = await mockAccount(page, context);
  await page.goto('/quests');
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Drink a glass of water');
  await page.getByRole('switch', { name: 'Repeat daily', exact: true }).click();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'View quest Drink a glass of water', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Complete Drink a glass of water', exact: true }).click();
  await expect.poll(() => data.state.coins).toBe(70);
  const task = data.state.tasks.find((task) => task.title === 'Drink a glass of water');
  expect(task.recurrence).toBe('daily');
  await page.getByRole('button', { name: /^Done/ }).click();
  await expect(
    page.getByRole('button', { name: 'View quest Drink a glass of water', exact: true }),
  ).toBeVisible();
});
