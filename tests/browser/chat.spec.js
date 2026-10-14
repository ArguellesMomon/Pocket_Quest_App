import { test, expect } from '@playwright/test';
import { createGame, applyAction } from '../../shared/game.js';

async function chooseCompanion(page, name) {
  await page.getByRole('button', { name: 'Your chat companion', exact: true }).click();
  await page.getByRole('option', { name, exact: true }).click();
}

async function chatAccount(context) {
  let state = createGame();
  state.pet.species = 'samo';
  state.pet.name = 'Finn';
  const owner = 'chat-qa';
  const token = `e30.${Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await context.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user: { id: owner, name: 'QA' } } }),
  );
  await context.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  let version = 0;
  await context.route('**/api/game', (route) => {
    if (route.request().method() === 'POST') {
      state = applyAction(state, route.request().postDataJSON()).state;
      version++;
    }
    return route.fulfill({ json: { state, version } });
  });
  const histories = { samo: [], chami: [] };
  const data = { histories, posts: [], fail: false, available: true, gate: null };
  await context.route('**/api/chat**', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const body = request.method() === 'POST' ? request.postDataJSON() : null;
    const character = body?.character || url.searchParams.get('character');
    histories[character] ||= [];
    if (body) {
      data.posts.push(body);
      if (data.gate) await data.gate;
      if (data.fail)
        return route.fulfill({
          status: 429,
          json: {
            error: 'Our free AI service is taking a breather. Please try again in a little while.',
            quota: { remaining: 20 - data.posts.length, limit: 20, resetAt: Date.now() + 86400000 },
          },
        });
      if (!histories[character].some((turn) => turn.id === body.id))
        histories[character].push({
          id: body.id,
          sequence: String(data.posts.length),
          message: body.message,
          reply: character === 'samo' ? 'Victory lap! Proud of you.' : 'Purrfect timing, human.',
        });
    }
    if (request.method() === 'DELETE') histories[character] = [];
    await route.fulfill({
      json: {
        turns: histories[character],
        before: null,
        available: data.available,
        quota: { remaining: 20 - data.posts.length, limit: 20, resetAt: Date.now() + 86400000 },
      },
    });
  });
  return data;
}
test('signed-out visitors must sign in before opening pets or chat', async ({ page, context }) => {
  await context.route('**/api/auth/get-session', (route) => route.fulfill({ json: null }));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/habitat');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByText(/guest/i)).toHaveCount(0);
});
test('account chats persist separately, retry safely, clear one character and fit mobile/dark layouts', async ({
  page,
  context,
}) => {
  const data = await chatAccount(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/habitat');
  await page.getByRole('button', { name: 'Talk to your companion' }).click();
  const draft = page.getByRole('textbox', { name: 'Message Finn' });
  await expect(draft).toBeEnabled();
  data.fail = true;
  await draft.fill('I finished my task');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('taking a breather');
  await expect(draft).toHaveValue('I finished my task');
  await expect(page.getByText('19 left today', { exact: true })).toBeVisible();
  data.fail = false;
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toBeVisible();
  expect(data.posts[0].id).toBe(data.posts[1].id);
  await chooseCompanion(page, 'Chami');
  await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Message Chami' }).fill('Hello Chami');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Purrfect timing, human.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('button', { name: "Clear Chami's conversation" }).click();
  await page.getByRole('button', { name: 'Keep chat' }).click();
  expect(data.histories.chami.length).toBe(1);
  await page.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('button', { name: "Clear Chami's conversation" }).click();
  await page.getByRole('button', { name: 'Clear conversation', exact: true }).click();
  await expect(page.getByText('Purrfect timing, human.', { exact: true })).toHaveCount(0);
  expect(data.histories.samo.length).toBe(1);
  await chooseCompanion(page, 'Finn');
  await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await page.getByRole('button', { name: 'Talk to your companion' }).click();
  await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message Finn' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/previews/companion-chat-mobile.png',
    animations: 'disabled',
  });
});
test('missing provider configuration shows saved chat with a disabled composer', async ({
  page,
  context,
}) => {
  const data = await chatAccount(context);
  data.available = false;
  await page.goto('/habitat');
  await page.getByRole('button', { name: 'Talk to your companion' }).click();
  await expect(page.getByText('Chat is unavailable right now.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message Finn' })).toBeDisabled();
});

test('a late reply stays in its own character’s history when the user switches chats', async ({
  page,
  context,
}) => {
  const data = await chatAccount(context);
  let release;
  data.gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.goto('/habitat');
  await page.getByRole('button', { name: 'Talk to your companion' }).click();
  await page.getByRole('textbox', { name: 'Message Finn' }).fill('A win for Finn');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => data.posts.length).toBe(1);
  await chooseCompanion(page, 'Chami');
  await expect(page.getByRole('textbox', { name: 'Message Chami' })).toBeEnabled();
  release();
  await expect.poll(() => data.histories.samo.length).toBe(1);
  await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await chooseCompanion(page, 'Finn');
  await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toBeVisible();
});

test('the character picker has readable names in both themes and supports keyboard selection', async ({
  page,
  context,
}) => {
  await chatAccount(context);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/habitat');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
    await page.getByRole('button', { name: 'Talk to your companion' }).click();
    const picker = page.getByRole('button', { name: 'Your chat companion', exact: true });
    await picker.click();
    const list = page.getByRole('listbox', { name: 'Chat companions' });
    await expect(list.getByRole('option')).toHaveCount(6);
    for (const name of ['Mochi', 'Nori', 'Pip', 'Maple', 'Finn', 'Chami'])
      await expect(list.getByRole('option', { name, exact: true })).toBeVisible();
    const contrast = await list.getByRole('option').evaluateAll((elements) => {
      const luminance = (rgb) =>
        rgb
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      return elements.map((element) => {
        const style = getComputedStyle(element),
          foreground = luminance(style.color),
          background = luminance(style.backgroundColor);
        return (
          (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
        );
      });
    });
    contrast.forEach((ratio) => expect(ratio).toBeGreaterThanOrEqual(4.5));
    const bounds = await list.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
    if (theme === 'dark')
      await page.screenshot({
        path: 'docs/previews/companion-picker-dark-mobile.png',
        animations: 'disabled',
      });
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(picker).toBeFocused();
    await picker.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Finn', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('option', { name: 'Chami', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(picker).toContainText('Chami');
    await expect(page.getByRole('textbox', { name: 'Message Chami' })).toBeEnabled();
    await chooseCompanion(page, 'Finn');
    await page.getByRole('button', { name: 'Close dialog' }).click();
  }
});

test.describe('chat with a phone keyboard', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('the composer and send action can be reached above the keyboard', async ({
    page,
    context,
  }) => {
    await chatAccount(context);
    await page.addInitScript(() => {
      const viewport = new EventTarget();
      Object.assign(viewport, { height: innerHeight, offsetTop: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
      window.testKeyboard = (height) => {
        viewport.height = height;
        viewport.dispatchEvent(new Event('resize'));
      };
    });
    await page.goto('/habitat');
    await page.getByRole('button', { name: 'Talk to your companion' }).click();
    const draft = page.getByRole('textbox', { name: 'Message Finn' });
    await draft.focus();
    await expect(draft).toHaveCSS('font-size', '16px');
    await page.evaluate(() => window.testKeyboard(360));
    await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', 'true');
    const sheet = await page.getByRole('dialog').boundingBox();
    expect(sheet.y + sheet.height).toBeLessThanOrEqual(361);
    await draft.fill('Hello from my phone');
    const send = page.getByRole('button', { name: 'Send', exact: true });
    await send.scrollIntoViewIfNeeded();
    const bounds = await send.boundingBox();
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(361);
    await send.click();
    await expect(page.getByText('Victory lap! Proud of you.', { exact: true })).toBeVisible();
  });
});
