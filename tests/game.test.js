import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  CATALOG,
  completed,
  createGame,
  dayKey,
  levelFor,
  petStats,
  streakFor,
  upgradeGame,
} from '../shared/game.js';
const now = Date.parse('2026-10-12T16:30:00Z');
const action = (state, type, extra = {}, at = now) =>
  applyAction(state, { id: crypto.randomUUID(), type, ...extra }, at).state;
test('rewards are derived from effort, duplicate completion cannot award twice, and once quests stay complete', () => {
  const initial = createGame('cat', now);
  const state = action(initial, 'task.complete', { taskId: 'starter-1', coins: 9999 });
  assert.equal(state.coins, 80);
  assert.equal(state.xp, 30);
  assert.equal(initial.coins, 60);
  assert.throws(() => action(state, 'task.complete', { taskId: 'starter-1' }), /already earned/);
  assert.equal(completed(state, state.tasks[0], now + 86400000), true);
  assert.throws(
    () =>
      action(state, 'task.edit', {
        taskId: 'starter-1',
        data: { ...state.tasks[0], recurrence: 'daily' },
      }),
    /cannot be edited/,
  );
});
test('daily refresh follows user timezone and third quest bonus is awarded exactly once', () => {
  let state = createGame('fox', now);
  for (const taskId of ['starter-1', 'starter-2', 'starter-3'])
    state = action(state, 'task.complete', { taskId });
  assert.equal(state.coins, 120);
  assert.equal(state.xp, 85);
  assert.deepEqual(state.bonusDays, ['2026-10-13']);
  state = action(state, 'task.complete', { taskId: 'starter-4' });
  assert.equal(state.coins, 130);
  assert.equal(completed(state, state.tasks[1], now + 86400000), false);
  state = action(state, 'task.complete', { taskId: 'starter-2' }, now + 86400000);
  assert.equal(state.coins, 140);
  assert.equal(streakFor(state, now + 86400000), 2);
  assert.equal(streakFor(state, now + 2 * 86400000), 2);
  assert.equal(streakFor(state, now + 3 * 86400000), 0);
  assert.equal(dayKey(now, 'America/Los_Angeles'), '2026-10-12');
});
test('purchases enforce prices, unlocks, funds, and ownership; care consumes actual inventory', () => {
  let state = createGame('cat', now);
  assert.throws(() => action(state, 'item.buy', { itemId: 'cloud', cost: 0 }), /level 4/);
  state = action(state, 'item.buy', { itemId: 'plant', cost: 0 });
  assert.equal(state.coins, 0);
  assert.equal(state.inventory.plant, 1);
  assert.throws(() => action(state, 'item.buy', { itemId: 'plant' }), /already own/);
  assert.throws(() => action(state, 'item.buy', { itemId: 'berry' }), /more coins/);
  state = action(state, 'item.use', { itemId: 'plant' });
  assert.deepEqual(state.equipped.decor, ['plant']);
  state = action(state, 'item.use', { itemId: 'plant' });
  assert.deepEqual(state.equipped.decor, []);
  state = action(state, 'item.use', { itemId: 'berry' });
  assert.equal(state.inventory.berry, 1);
  assert.equal(state.pet.energy, 100);
  assert.equal(state.careCount, 1);
  state = action(state, 'item.use', { itemId: 'berry' });
  assert.throws(() => action(state, 'item.use', { itemId: 'berry' }), /market first/);
  assert.equal(
    CATALOG.every((i) => Number.isInteger(i.cost) && i.cost > 0),
    true,
  );
});
test('idle decay is bounded, cannot run backward, and never harms the companion below the gentle floor', () => {
  const state = createGame('bunny', now);
  assert.deepEqual(petStats(state, now - 60000), { energy: 85, joy: 90 });
  state.pet.energy = 21;
  state.pet.joy = 21;
  assert.deepEqual(petStats(state, now + 86400000 * 10), { energy: 20, joy: 20 });
  assert.equal(levelFor(150), 2);
  assert.equal(levelFor(749), 5);
});
test('legacy clothing becomes backgrounds without changing earned progress; upgrade is idempotent', () => {
  const old = createGame('cat', now);
  old.inventory = { ...old.inventory, scarf: 1, crown: 1, night: 1 };
  old.equipped = { decor: ['plant'], outfit: 'scarf', habitat: 'mushroom' };
  const upgraded = upgradeGame(old);
  assert.deepEqual(upgraded.inventory, { berry: 2, ball: 1, sunset: 1, cloud: 1, night: 1 });
  assert.deepEqual(upgraded.equipped, {
    decor: ['plant'],
    background: 'sunset',
    habitat: 'mushroom',
  });
  assert.equal(upgraded.coins, old.coins);
  assert.equal(upgraded.xp, old.xp);
  assert.equal(old.equipped.outfit, 'scarf');
  assert.deepEqual(upgradeGame(upgraded), upgraded);
  old.equipped.habitat = 'night';
  assert.equal(upgradeGame(old).equipped.background, 'night');
  assert.equal(upgradeGame(old).equipped.habitat, null);
});
test('background purchases apply immediately, retain decor and companion, and remain owned after reset', () => {
  let state = createGame('pip', now);
  state.coins = 100;
  state = action(state, 'item.buy', { itemId: 'sunset', equip: true });
  assert.equal(state.coins, 20);
  assert.equal(state.equipped.background, 'sunset');
  assert.equal(state.pet.species, 'pip');
  state = action(state, 'background.reset');
  assert.equal(state.equipped.background, null);
  assert.equal(state.inventory.sunset, 1);
  state = action(state, 'item.use', { itemId: 'sunset' });
  assert.equal(state.equipped.background, 'sunset');
  assert.equal(state.coins, 20);
  assert.throws(() => action(state, 'item.buy', { itemId: 'sunset' }), /already own/);
  assert.throws(() => action(state, 'item.use', { itemId: 'cloud' }), /market first/);
  assert.equal(
    CATALOG.some((item) => item.category === 'Outfits'),
    false,
  );
});
test('Finn rename preserves custom names and Chami joins without resetting progress', () => {
  const old = createGame('samo', now);
  old.pet.name = 'Samo';
  assert.equal(upgradeGame(old).pet.name, 'Finn');
  old.pet.name = 'Snowball';
  assert.equal(upgradeGame(old).pet.name, 'Snowball');
  const chami = action(old, 'pet.switch', { species: 'chami' });
  assert.equal(chami.pet.name, 'Chami');
  assert.equal(chami.coins, old.coins);
  assert.deepEqual(chami.inventory, old.inventory);
});
test('new collectibles have authoritative prices and usable food, toys, and room effects', () => {
  let state = createGame('chami', now);
  state.xp = 450;
  state.coins = 500;
  state.pet.energy = 20;
  state.pet.joy = 20;
  for (const id of ['salmon', 'pancakes', 'smoothie', 'mouse', 'cushion', 'nightlight']) {
    const item = CATALOG.find((item) => item.id === id);
    const before = state.coins;
    state = action(state, 'item.buy', { itemId: id, equip: true, cost: 0 });
    assert.equal(state.coins, before - item.cost);
    if (item.consumable) {
      state = action(state, 'item.use', { itemId: id });
      assert.equal(state.inventory[id], 0);
    } else assert.ok(state.equipped.decor.includes(id));
  }
  assert.equal(state.careCount, 4);
  assert.equal(state.pet.energy, 100);
  assert.equal(state.pet.joy, 80);
  assert.equal(new Set(CATALOG.map((item) => item.id)).size, CATALOG.length);
});
test('custom quests validate fields; deletion preserves past progress', () => {
  let state = createGame('cat', now);
  const fields = {
    title: '  Draw a thing  ',
    notes: '',
    category: 'Creative',
    difficulty: 'bold',
    recurrence: 'once',
    due: '',
  };
  state = action(state, 'task.create', { taskId: 'test-quest-id', data: fields });
  assert.equal(state.tasks.at(-1).title, 'Draw a thing');
  assert.throws(
    () => action(state, 'task.create', { taskId: 'another-test', data: { ...fields, title: ' ' } }),
    /Quest title/,
  );
  state = action(state, 'task.complete', { taskId: 'test-quest-id' });
  state = action(state, 'task.delete', { taskId: 'test-quest-id' });
  assert.equal(state.completions.length, 1);
  assert.equal(state.coins, 95);
  assert.equal(state.xp, 50);
});
