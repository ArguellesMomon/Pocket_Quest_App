import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
async function guest(page, species = 'Mochi') {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(`Choose ${species},`) }).click();
  await page.getByRole('button', { name: /Let.s play/ }).click();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
}
async function snapshot(page, path) {
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.count()) await dismiss.click();
  await page.screenshot({
    path: `docs/previews/${path}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}
test('compact quests, direct purchases, equipment, care, and settings persist', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page);
  await page
    .getByRole('button', { name: 'Complete Make space for one important thing', exact: true })
    .click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('80');
  await page.getByRole('button', { name: 'Add a quest', exact: true }).click();
  await page.getByRole('textbox', { name: 'Quest', exact: true }).fill('Ship my portfolio');
  await page.getByRole('button', { name: /Hard/ }).click();
  await page.getByRole('button', { name: 'Add quest', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Ship my portfolio', exact: true }).click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('115');
  await page.reload();
  await expect(page.locator('.wallet-pill strong')).toHaveText('115');
  await page.getByRole('link', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: 'Buy Little fern for 60 coins', exact: true }).click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('55');
  await expect(page.getByRole('button', { name: 'Remove Little fern', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Pets', exact: true }).click();
  await page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  await expect(page.locator('.scene-companion .sprite-pet')).toHaveAttribute('data-mood', 'eating');
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Pip, Dog', exact: true }).click();
  await expect(page.locator('.pet-scene-labels>strong')).toContainText('Pip');
  await expect(page.locator('.wallet-pill strong')).toHaveText('55');
  await page.getByRole('link', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: 'dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Richmond');
  await page.getByLabel('Companion name', { exact: true }).fill('Pipster');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Companion name', { exact: true })).toHaveValue('Pipster');
  expect(errors).toEqual([]);
});
test('phone screens fit the viewport, navigation stays visible, and quests paginate', async ({
  page,
}) => {
  test.setTimeout(60000);
  await guest(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 768, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    for (const route of ['/dashboard', '/quests', '/habitat', '/market', '/journey', '/settings']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/quests');
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: 'Add a quest', exact: true }).click();
    await page.getByRole('textbox', { name: 'Quest', exact: true }).fill(`Quest ${i}`);
    await page.getByRole('button', { name: 'Add quest', exact: true }).click();
  }
  await expect(page.locator('.paged-quests .quest-row')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.pager')).toContainText('2 / 3');
  await page.getByRole('button', { name: 'Search quests', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search quests', exact: true }).fill('xyz-no-quest');
  await expect(page.getByText('No matching quests', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
});
test('sprites visibly advance, react to care, and respect reduced motion; focus stays available in a sheet', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page, 'Finn');
  const pet = page.locator('.scene-companion .sprite-pet');
  const initial = await pet.getAttribute('data-frame');
  await expect.poll(() => pet.getAttribute('data-frame')).not.toBe(initial);
  await page.getByRole('button', { name: 'Play with companion', exact: true }).click();
  await expect(pet).toHaveAttribute('data-mood', 'playful');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(pet).toHaveAttribute('data-frame', '4-0');
  const frame = await pet.getAttribute('data-frame');
  await page.waitForTimeout(750);
  expect(await pet.getAttribute('data-frame')).toBe(frame);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await page.getByRole('button', { name: 'Start focusing', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('phone-first visual previews', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await snapshot(page, 'welcome-mobile');
  await page.getByRole('button', { name: /Let.s play/ }).click();
  await snapshot(page, 'today-mobile-light');
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await snapshot(page, 'today-mobile-dark');
  await page.goto('/habitat');
  await snapshot(page, 'pets-mobile');
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  await snapshot(page, 'friends-mobile');
  await page.goto('/market');
  await snapshot(page, 'market-mobile');
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await snapshot(page, 'room-mobile');
  await page.getByRole('button', { name: 'Scenes', exact: true }).click();
  await snapshot(page, 'backgrounds-mobile');
  for (const [name, path] of [
    ['Cloud nine', 'cloud'],
    ['Starlight clearing', 'night'],
  ]) {
    await page.getByRole('button', { name: `Details for ${name}`, exact: true }).click();
    await snapshot(page, `scene-${path}-preview`);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await snapshot(page, 'backgrounds-mobile-light');
  await page.getByRole('button', { name: 'Care', exact: true }).click();
  await snapshot(page, 'market-mobile-light');
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await page.goto('/journey');
  await snapshot(page, 'journey-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard');
  await snapshot(page, 'today-desktop-dark');
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await snapshot(page, 'today-desktop-light');
  await page.goto('/welcome');
  await snapshot(page, 'welcome-desktop');
  await page.goto('/habitat');
  await snapshot(page, 'habitat-desktop');
  await page.goto('/journey');
  await snapshot(page, 'journey-desktop');
});
test('clear shop controls buy, use, preview, and apply scenes without losing purchases', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page);
  await expect(page.getByRole('button', { name: 'Add a quest', exact: true })).toHaveText(
    'New quest',
  );
  await page
    .getByRole('button', { name: 'Complete Make space for one important thing', exact: true })
    .click();
  await page.getByRole('link', { name: 'Change background', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Scenes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Buy Peach beach for 80 coins', exact: true }),
  ).toContainText('Buy');
  await page.getByRole('button', { name: 'Details for Peach beach', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.habitat-art')).toHaveAttribute(
    'data-background',
    'sunset',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Buy Peach beach for 80 coins', exact: true }).click();
  await expect(page.locator('.wallet-pill strong')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reset Peach beach', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.locator('.habitat-art')).toHaveAttribute('data-background', 'sunset');
  await snapshot(page, 'peach-beach-mobile');
  await page.getByRole('link', { name: 'Change background', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Dream garden', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Peach beach', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reset Peach beach', exact: true })).toBeVisible();
  await expect(page.locator('.wallet-pill strong')).toHaveText('0');
  await page.getByRole('button', { name: 'Care', exact: true }).click();
  await page.getByRole('button', { name: 'Use Berry bites', exact: true }).click();
  await expect(
    page
      .getByRole('button', { name: 'Details for Berry bites', exact: true })
      .locator('.quantity-chip'),
  ).toHaveText('×1');
  const broken = await page
    .locator('.item-preview img')
    .evaluateAll((images) => images.some((img) => !img.complete || !img.naturalWidth));
  expect(broken).toBe(false);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    for (const group of ['Care', 'Room', 'Scenes']) {
      await page.getByRole('button', { name: group, exact: true }).click();
      const cardBounds = await page
        .locator('.item-tile')
        .evaluateAll((cards) =>
          cards.map((card) => ({ width: card.clientWidth, scroll: card.scrollWidth })),
        );
      expect(cardBounds.every((b) => b.scroll <= b.width + 1)).toBe(true);
      const layout = await page
        .locator('.compact-items')
        .evaluate((el) => ({ height: el.clientHeight, content: el.scrollHeight }));
      expect(
        layout.content <= layout.height + 1,
        `${width}px ${group}: ${JSON.stringify(layout)}`,
      ).toBe(true);
    }
  }
});
test('low-stat moods render the correct sprite rows for the new characters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await guest(page);
  for (const c of [
    { id: 'cat', name: 'Mochi', energy: 30, joy: 75, mood: 'sleepy', row: 2 },
    { id: 'nori', name: 'Nori', energy: 75, joy: 30, mood: 'lonely', row: 5 },
    { id: 'pip', name: 'Pip', energy: 50, joy: 90, mood: 'hungry', row: 4 },
    { id: 'maple', name: 'Maple', energy: 90, joy: 90, mood: 'happy', row: 1 },
    { id: 'chami', name: 'Chami', energy: 30, joy: 75, mood: 'sleepy', row: 1 },
    { id: 'chami', name: 'Chami', energy: 50, joy: 75, mood: 'hungry', row: 3 },
    { id: 'chami', name: 'Chami', energy: 75, joy: 30, mood: 'lonely', row: 4 },
  ]) {
    await page.evaluate((c) => {
      const state = JSON.parse(localStorage.getItem('pocketquest-guest-v1'));
      Object.assign(state.pet, {
        species: c.id,
        name: c.name,
        energy: c.energy,
        joy: c.joy,
        updatedAt: Date.now(),
        lastInteraction: null,
      });
      localStorage.setItem('pocketquest-guest-v1', JSON.stringify(state));
    }, c);
    await page.goto('/habitat');
    await page.reload();
    const pet = page.locator('.scene-companion .sprite-pet');
    await expect(pet).toHaveAttribute('data-mood', c.mood);
    await expect(pet).toHaveAttribute('data-frame', `${c.row}-0`);
    await page
      .locator('.pet-scene')
      .screenshot({ path: `docs/previews/mood-${c.id}-${c.mood}.png`, animations: 'disabled' });
  }
});
test('Chami reacts with her own frames and new shop pages buy, use, and display collectibles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page, 'Chami');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pet = page.locator('.scene-companion .sprite-pet');
  await expect(pet).toHaveAttribute('data-mood', 'happy');
  await expect(pet).toHaveCSS('background-image', /chami\.webp/);
  await page.getByRole('button', { name: 'Say hello to Chami', exact: true }).click();
  await expect(pet).toHaveAttribute('data-frame', '1-2');
  await expect(pet).toHaveCSS('background-image', /chami-idle\.webp/);
  await page.reload();
  await page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  await expect(pet).toHaveAttribute('data-mood', 'eating');
  await expect(pet).toHaveAttribute('data-frame', '5-0');
  await snapshot(page, 'chami-eating-mobile');
  await page.getByRole('button', { name: 'Play with companion', exact: true }).click();
  await expect(pet).toHaveAttribute('data-frame', '2-0');
  await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('pocketquest-guest-v1'));
    game.coins = 1000;
    game.xp = 450;
    localStorage.setItem('pocketquest-guest-v1', JSON.stringify(game));
  });
  await page.goto('/market');
  await page.getByRole('button', { name: 'Buy Salmon treats for 20 coins', exact: true }).click();
  await page.getByRole('button', { name: 'Use Salmon treats', exact: true }).click();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  for (const [name, cost] of [
    ['Sunrise pancakes', 35],
    ['Peach smoothie', 30],
    ['Pocket mouse', 25],
  ])
    await page.getByRole('button', { name: `Buy ${name} for ${cost} coins`, exact: true }).click();
  await snapshot(page, 'new-items-mobile');
  await page.getByRole('button', { name: 'Use Pocket mouse', exact: true }).click();
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await expect(page.locator('.pager')).toContainText('1 / 2');
  await page.getByRole('button', { name: 'Buy Star pillow for 110 coins', exact: true }).click();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await page.getByRole('button', { name: 'Buy Mushroom glow for 130 coins', exact: true }).click();
  await page.getByRole('link', { name: 'Pets', exact: true }).click();
  await expect(page.locator('.scene-cushion')).toBeVisible();
  await expect(page.locator('.scene-nightlight')).toBeVisible();
  await expect(page.locator('.pet-scene-labels>strong')).toContainText('Chami');
  await snapshot(page, 'chami-mobile');
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size);
    await page.getByRole('button', { name: 'Room', exact: true }).click();
    await page.getByRole('button', { name: 'Care', exact: true }).click();
    expect(
      await page
        .locator('.pet-tool-panel')
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
    await expect(page.locator('.item-browser .pager')).toBeVisible();
  }
  await page.reload();
  await expect(page.locator('.wallet-pill strong')).toHaveText('650');
  await expect(page.locator('.scene-cushion')).toBeVisible();
});
test('Neon cloud progress and safe retry remain compatible with the new UI', async ({ page }) => {
  test.skip(process.env.RUN_CLOUD_E2E !== '1', 'Opt in to a disposable Neon QA account.');
  const email = `pocketquest-browser-qa-${Date.now()}@example.invalid`,
    password = `Qa-${randomUUID()}-9!`;
  const signup = await page.request.post('/api/auth/sign-up/email', {
    data: { email, password, name: 'Cloud QA' },
    headers: { Origin: 'http://127.0.0.1:5175' },
  });
  expect(signup.ok()).toBe(true);
  await page.request.post('/api/auth/sign-out', {
    data: {},
    headers: { Origin: 'http://127.0.0.1:5175' },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Continue adventure', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  let interrupted = false,
    committed = false,
    holdRetry = true;
  const operations = [];
  await page.route('**/api/game', async (route) => {
    if (route.request().method() === 'POST') {
      operations.push(route.request().postDataJSON().id);
      if (!interrupted) {
        interrupted = true;
        await route.fetch();
        committed = true;
        await route.abort('failed');
      } else if (holdRetry) await route.abort('failed');
      else await route.continue();
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  await expect.poll(() => committed).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some(
          (key) =>
            key.startsWith('pocketquest-cloud-v2:') &&
            JSON.parse(localStorage.getItem(key)).queue.length,
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator('.sync-banner')).not.toBeVisible();
  await expect(
    page.getByText('An action is waiting for confirmation. Retry safely to finish syncing.'),
  ).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Buy and feed a berry bite for 15 coins', exact: true }),
  ).not.toBeVisible();
  holdRetry = false;
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Object.keys(localStorage).some(
            (key) =>
              key.startsWith('pocketquest-cloud-v2:') &&
              JSON.parse(localStorage.getItem(key)).queue.length,
          ),
        ),
      { timeout: 15000 },
    )
    .toBe(false);
  expect(operations.length).toBeGreaterThan(1);
  expect(new Set(operations).size).toBe(1);
  await expect(page.locator('.wallet-pill strong')).toHaveText('60');
  await expect(
    page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).locator('small'),
  ).toHaveText('×1');
  await page.getByRole('link', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: /Let.s play/ })).toBeVisible();
});
