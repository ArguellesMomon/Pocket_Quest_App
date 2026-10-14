import { test, expect } from '@playwright/test';
import { createGame, dayKey } from '../../shared/game.js';
import { mockAccount } from './account-fixture.js';

async function adventure(page, context, transform = (state) => state) {
  const state = transform(createGame('samo'));
  await mockAccount(page, context, { state });
  await page.addInitScript((state) => {
    window.touchCues = [];
    window.soundCues = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern) => {
        window.touchCues.push(pattern);
        return true;
      },
    });
    class Audio {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          frequency: { value: 0 },
          connect() {},
          disconnect() {},
          start() {
            window.soundCues.push(this.frequency.value);
          },
          stop() {},
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
          disconnect() {},
        };
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: Audio });
  }, state);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
}
const currentQuest = (page) => page.getByRole('region', { name: 'Current quest' });
async function finish(page) {
  await currentQuest(page)
    .getByRole('button', { name: /^Complete / })
    .click();
}

test('Today fits small and large phones and desktop with its primary action above navigation', async ({
  page,
  context,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await adventure(page, context);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    const complete = currentQuest(page).getByRole('button', { name: /^Complete / });
    await expect(complete).toBeInViewport();
    const bounds = await complete.boundingBox();
    const title = await currentQuest(page).locator('h2').boundingBox();
    const rewards = await currentQuest(page).locator('.today-quest-rewards').boundingBox();
    const actions = await currentQuest(page).locator('.today-quest-actions').boundingBox();
    expect(title.y + title.height).toBeLessThanOrEqual(rewards.y);
    expect(rewards.y + rewards.height).toBeLessThanOrEqual(actions.y);
    const nav =
      viewport.width <= 760
        ? await page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox()
        : null;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(nav?.y || viewport.height);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('.main-content')
        .evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({
    path: 'docs/previews/today-play-small-phone.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/previews/today-play-mobile-light.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.screenshot({
    path: 'docs/previews/today-play-mobile-dark.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/previews/today-play-desktop.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Say hello to Finn' }).click();
  await expect(page.getByText('Finn is happy to see you!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Talk to Finn' }).click();
  await expect(page.getByRole('dialog', { name: 'Talk to Finn' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect(errors).toEqual([]);
});

test('quest → reward → next quest awards once and the third win unlocks the real daily bonus', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adventure(page, context, (state) => {
    state.settings.dailyGoal = 5;
    return state;
  });
  const complete = currentQuest(page).getByRole('button', { name: /^Complete / });
  await complete.evaluate((button) => {
    button.click();
    button.click();
  });
  const loot = page.getByRole('region', { name: 'Quest reward' });
  await expect(loot).toContainText('+20');
  await expect(loot).toContainText('+30');
  const art = await loot.locator('.today-reward-art').boundingBox();
  const heading = await loot.locator('.today-reward-heading').boundingBox();
  expect(art.y + art.height).toBeLessThanOrEqual(heading.y);
  await expect(page.locator('.wallet-pill strong')).toHaveText('80');
  await page.getByRole('button', { name: 'Next task', exact: true }).click();
  await expect(currentQuest(page).getByRole('button', { name: /^Complete / })).toBeFocused();
  await finish(page);
  await expect(page.locator('.wallet-pill strong')).toHaveText('90');
  await page.getByRole('button', { name: 'Next task', exact: true }).click();
  await finish(page);
  await expect(loot).toContainText('DAILY BONUS UNLOCKED');
  await expect(loot).toContainText('+30');
  await expect(loot).toContainText('+40');
  await expect(page.locator('.wallet-pill strong')).toHaveText('120');
  await expect(page.locator('.today-trail')).toContainText('3/5');
  await page.screenshot({ path: 'docs/previews/today-play-reward.png', animations: 'disabled' });
  await page.getByRole('button', { name: "View today's progress and daily bonus" }).click();
  await expect(page.getByRole('dialog')).toContainText('Daily treasure earned');
  await expect(page.locator('.today-win-row')).toHaveCount(3);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(page.locator('.wallet-pill strong')).toHaveText('120');
  await expect(page.locator('.today-trail')).toContainText('Bonus earned');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('pocketquest-cloud-v2:design-qa')).base.completions.length,
    ),
  ).toBe(3);
});

test('queue taps reach every quest; urgency wins priority; long titles remain readable in details', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const title =
    'A very long quest name that needs room to be read before choosing the next small step on this journey';
  await adventure(page, context, (state) => {
    const today = dayKey(Date.now(), state.timezone);
    state.tasks.push({
      ...state.tasks[0],
      id: 'urgent',
      title,
      due: '2020-01-01',
      createdAt: Date.now() - 99999,
    });
    state.tasks.push({
      ...state.tasks[0],
      id: 'today',
      title: 'Due today',
      due: today,
      createdAt: Date.now(),
    });
    for (let index = 0; index < 5; index++)
      state.tasks.push({
        ...state.tasks[0],
        id: `extra-${index}`,
        title: `Extra quest ${index}`,
        createdAt: Date.now() + index,
      });
    return state;
  });
  await expect(currentQuest(page)).toContainText('Overdue');
  await expect(
    currentQuest(page).getByRole('button', { name: `View quest ${title}` }),
  ).toBeVisible();
  await currentQuest(page)
    .getByRole('button', { name: `View quest ${title}` })
    .click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: title })).toHaveText(title);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Next quest in deck' }).click();
  await expect(currentQuest(page).getByRole('heading', { name: 'Due today' })).toBeVisible();
  await page.getByRole('button', { name: /Choose a quest,/ }).click();
  await expect(page.locator('.today-queue-item')).toHaveCount(3);
  await page.getByRole('button', { name: 'Next quest page' }).click();
  const chosen = await page.locator('.today-queue-item strong').first().textContent();
  await page.locator('.today-queue-item').first().click();
  await expect(
    currentQuest(page).getByRole('heading', { name: chosen, exact: true }),
  ).toBeVisible();
  await expect(currentQuest(page).getByRole('button', { name: /^Complete / })).toBeInViewport();
});

test('focus preselects the current quest and keeps its running timer across reload', async ({
  page,
  context,
}) => {
  await adventure(page, context);
  await page.getByRole('button', { name: 'Focus on Make space for one important thing' }).click();
  await expect(page.getByLabel('Quest to focus on')).toHaveValue('starter-1');
  await page.getByRole('button', { name: 'Start focusing' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Next quest in deck' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(page.getByLabel('Quest to focus on')).toHaveValue('starter-1');
});

test('sound and haptics respect their controls, persist, and reduced motion removes reward animation', async ({
  page,
  context,
}) => {
  await adventure(page, context);
  await expect(page.getByRole('button', { name: 'Sound and touch feedback' })).toHaveCount(0);
  await page.goto('/settings?tab=sounds');
  await expect(page.getByRole('switch', { name: 'Sound effects' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('switch', { name: 'Sound effects' }).click();
  await expect.poll(() => page.evaluate(() => window.soundCues.length)).toBeGreaterThan(0);
  await page.getByRole('switch', { name: 'Sound effects' }).click();
  await page.getByRole('switch', { name: 'Haptics' }).click();
  await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  const before = await page.evaluate(() => ({
    touch: window.touchCues.length,
    sound: window.soundCues.length,
  }));
  await page.getByRole('button', { name: 'Feed companion a berry bite', exact: true }).click();
  expect(
    await page.evaluate(() => ({ touch: window.touchCues.length, sound: window.soundCues.length })),
  ).toEqual(before);
  await page.reload();
  await page.goto('/settings?tab=sounds');
  await expect(page.getByRole('switch', { name: 'Sound effects' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finish(page);
  await expect(page.getByRole('region', { name: 'Quest reward' })).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('level-ups and the final quest have a clear return to the world', async ({
  page,
  context,
}) => {
  await adventure(page, context, (state) => {
    state.xp = 130;
    state.tasks = state.tasks.slice(0, 1);
    return state;
  });
  await finish(page);
  await expect(page.getByRole('region', { name: 'Quest reward' })).toContainText(
    'Finn leveled up!',
  );
  await page.getByRole('button', { name: 'Back to my day' }).click();
  await expect(page.getByRole('heading', { name: 'You did good today.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeVisible();
});

test('a rejected cloud completion restores the quest and removes its reward reveal', async ({
  page,
  context,
}) => {
  const state = createGame('samo');
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'today-rollback', exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await context.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user: { id: 'today-rollback', name: 'QA' } } }),
  );
  await context.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  await context.route('**/api/game', async (route) => {
    if (route.request().method() === 'POST') {
      await gate;
      return route.fulfill({
        status: 400,
        json: { error: 'This quest could not be completed. Please try again.' },
      });
    }
    return route.fulfill({ json: { state, version: 0 } });
  });
  await page.goto('/dashboard');
  await finish(page);
  await expect(page.getByRole('region', { name: 'Quest reward' })).toBeVisible();
  await expect(page.locator('.wallet-pill strong')).toHaveText('80');
  release();
  await expect(
    currentQuest(page).getByRole('heading', { name: state.tasks[0].title }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Quest reward' })).toHaveCount(0);
  await expect(page.locator('.wallet-pill strong')).toHaveText('60');
});
