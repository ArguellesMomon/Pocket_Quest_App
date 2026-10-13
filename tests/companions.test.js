import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, petStats, applyAction } from '../shared/game.js';
import { moodFor, frameFor, companionFor, SELECTABLE_COMPANIONS } from '../shared/companions.js';
const now = Date.parse('2026-10-13T06:00:00Z');
test('companion moods follow stats and real actions, then return to the underlying mood', () => {
  const state = createGame('cat', now);
  assert.equal(moodFor(state, { joy: 90, energy: 85 }, now), 'happy');
  assert.equal(moodFor(state, { joy: 70, energy: 75 }, now), 'idle');
  assert.equal(moodFor(state, { joy: 80, energy: 50 }, now), 'hungry');
  assert.equal(moodFor(state, { joy: 40, energy: 70 }, now), 'lonely');
  assert.equal(moodFor(state, { joy: 40, energy: 25 }, now), 'sleepy');
  const fed = applyAction(state, { type: 'item.care', itemId: 'berry' }, now).state;
  assert.equal(moodFor(fed, petStats(fed, now), now), 'eating');
  assert.equal(moodFor(fed, petStats(fed, now + 7000), now + 7000), 'happy');
  const played = applyAction(state, { type: 'item.care', itemId: 'ball' }, now).state;
  assert.equal(moodFor(played, petStats(played, now), now), 'playful');
  const win = applyAction(state, { type: 'task.complete', taskId: 'starter-1' }, now).state;
  assert.equal(moodFor(win, petStats(win, now), now), 'celebrating');
});
test('quick care spends existing inventory first; an empty bag buys and uses in one validated action', () => {
  const state = createGame('pip', now);
  const first = applyAction(state, { type: 'item.care', itemId: 'berry' }, now).state;
  assert.equal(first.coins, 60);
  assert.equal(first.inventory.berry, 1);
  assert.equal(first.careCount, 1);
  first.inventory.berry = 0;
  const bought = applyAction(first, { type: 'item.care', itemId: 'berry', cost: 0 }, now).state;
  assert.equal(bought.coins, 45);
  assert.equal(bought.inventory.berry, 0);
  assert.equal(bought.careCount, 2);
  bought.coins = 0;
  assert.throws(
    () => applyAction(bought, { type: 'item.care', itemId: 'berry' }, now),
    /more coins/,
  );
  assert.throws(
    () => applyAction(first, { type: 'item.care', itemId: 'cloud' }, now),
    /snack or toy/,
  );
});
test('friend switching preserves progress, equipment purchases can equip atomically, and frame maps remain inside their atlases', () => {
  const state = createGame('cat', now);
  const bought = applyAction(state, { type: 'item.buy', itemId: 'plant', equip: true }, now).state;
  assert.deepEqual(bought.equipped.decor, ['plant']);
  assert.equal(bought.coins, 0);
  const changed = applyAction(bought, { type: 'pet.switch', species: 'maple' }, now).state;
  assert.equal(changed.pet.name, 'Maple');
  changed.pet.name = 'My Maple';
  const sameFriend = applyAction(changed, { type: 'pet.switch', species: 'maple' }, now).state;
  assert.equal(sameFriend.pet.name, 'My Maple');
  assert.equal(changed.coins, 0);
  assert.equal(changed.xp, state.xp);
  assert.deepEqual(changed.equipped.decor, ['plant']);
  assert.throws(
    () => applyAction(state, { type: 'pet.switch', species: 'unknown' }, now),
    /Choose a companion/,
  );
  for (const c of SELECTABLE_COMPANIONS)
    for (const mood of [
      'idle',
      'happy',
      'sleepy',
      'playful',
      'hungry',
      'lonely',
      'celebrating',
      'eating',
      'curious',
      'walking',
    ]) {
      for (const at of [0, 300, 700, 1500, 3000]) {
        const frame = frameFor(c, mood, at);
        assert.ok(frame.row < c.rows && frame.column < c.columns);
      }
      assert.deepEqual(frameFor(c, mood, 0, false), frameFor(c, mood, 5000, false));
    }
  assert.equal(companionFor('samo').rows, 9);
});
