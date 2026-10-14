import { test, expect } from '@playwright/test';
import { createGame } from '../../shared/game.js';

async function guest(page, context) {
  await context.route('**/api/auth/get-session', (route) => route.fulfill({ json: null }));
  await page.addInitScript((state) => {
    if (!localStorage.getItem('pocketquest-guest-v1'))
      localStorage.setItem('pocketquest-guest-v1', JSON.stringify(state));
    window.musicElements = [];
    window.musicGains = [];
    const NativeAudio = window.Audio,
      NativeContext = window.AudioContext;
    window.Audio = function (...args) {
      const element = new NativeAudio(...args);
      window.musicElements.push(element);
      return element;
    };
    const createGain = NativeContext.prototype.createGain;
    NativeContext.prototype.createGain = function (...args) {
      const gain = createGain.apply(this, args);
      window.musicGains.push(gain);
      return gain;
    };
  }, createGame('samo'));
  await page.goto('/settings?tab=sounds');
}
test('provided music starts softly, loops, persists and keeps playing across pages', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page, context);
  await expect(page.getByRole('switch', { name: 'Background music' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.getByRole('slider', { name: 'Music volume' })).toHaveValue('12');
  expect(await page.evaluate(() => window.musicElements.length)).toBe(0);
  await page.getByRole('switch', { name: 'Background music' }).click();
  await expect(page.getByText('Playing softly', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => ({
      loop: window.musicElements[0].loop,
      paused: window.musicElements[0].paused,
      volume: window.musicGains[0].gain.value,
    })),
  ).toEqual({ loop: true, paused: false, volume: expect.closeTo(0.12, 2) });
  const duration = await page.evaluate(() => window.musicElements[0].duration);
  expect(duration).toBeGreaterThan(0);
  for (let step = 0; step < 4; step++)
    await page.getByRole('slider', { name: 'Music volume' }).press('ArrowLeft');
  await expect
    .poll(() => page.evaluate(() => window.musicGains[0].gain.value))
    .toBeCloseTo(0.08, 2);
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  expect(await page.evaluate(() => window.musicElements.length)).toBe(1);
  expect(await page.evaluate(() => window.musicElements[0].paused)).toBe(false);
  await page.getByRole('link', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: 'Sounds', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Music volume' })).toHaveValue('8');
  await page.getByRole('switch', { name: 'Background music' }).click();
  await expect.poll(() => page.evaluate(() => window.musicElements[0].paused)).toBe(true);
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Background music' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.getByRole('slider', { name: 'Music volume' })).toHaveValue('8');
});
test('music pauses when hidden, resumes when visible and handles blocked playback', async ({
  page,
  context,
}) => {
  await guest(page, context);
  await page.evaluate(() => {
    window.testHidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.testHidden });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!window.allowMusic) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
      return play.call(this);
    };
  });
  await page.getByRole('switch', { name: 'Background music' }).click();
  await expect(page.getByRole('button', { name: 'Play background music' })).toBeVisible();
  await page.evaluate(() => {
    window.allowMusic = true;
  });
  await page.getByRole('button', { name: 'Play background music' }).click();
  await expect(page.getByText('Playing softly', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.testHidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => window.musicElements[0].paused)).toBe(true);
  await page.evaluate(() => {
    window.testHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Playing softly', { exact: true })).toBeVisible();
});
test('an unavailable music file can be retried without breaking the app', async ({
  page,
  context,
}) => {
  await guest(page, context);
  const pattern = '**/audio/pocket-quest-background.mp3';
  await context.route(pattern, (route) => route.fulfill({ status: 500, body: 'Unavailable' }));
  await page.getByRole('switch', { name: 'Background music' }).click();
  await expect(page.getByText('Music could not load. Try again.', { exact: true })).toBeVisible();
  await context.unroute(pattern);
  await page.getByRole('button', { name: 'Play background music' }).click();
  await expect(page.getByText('Playing softly', { exact: true })).toBeVisible();
});

test('sound settings and the guest profile menu fit phones in dark mode', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => localStorage.setItem('pocketquest-touch:guest', 'off'));
  await guest(page, context);
  await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('switch', { name: 'Background music' })).toBeInViewport();
    await expect(page.getByRole('switch', { name: 'Haptics' })).toBeInViewport();
  }
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({
    path: 'docs/previews/sound-settings-mobile.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menu', { name: 'Account actions' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: 'docs/previews/profile-menu-mobile.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.getByRole('button', { name: 'Account menu' }).press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Profile & settings' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Your name', exact: true })).toBeVisible();
});
test('the account menu signs out without opening the tutorial', async ({ page, context }) => {
  let signedOut = false;
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'profile-qa', exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await context.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: signedOut ? null : { user: { id: 'profile-qa', name: 'QA' } } }),
  );
  await context.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  await context.route('**/api/auth/sign-out', (route) => {
    signedOut = true;
    return route.fulfill({ json: { success: true } });
  });
  await context.route('**/api/game', (route) =>
    route.fulfill({ json: { state: createGame(), version: 0 } }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect.poll(() => signedOut).toBe(true);
  await expect(page.getByRole('button', { name: /Let.s play/ })).toBeVisible();
});
