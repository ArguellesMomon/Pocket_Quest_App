import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction } from '../shared/game.js';
import { createSnapshot, enqueue, projectedState, reconcile } from '../shared/outbox.js';
import { authServiceUnavailable } from '../server/auth-errors.js';
const action = (type, extra = {}) => ({ id: crypto.randomUUID(), type, ...extra });
test('commands preview immediately; acknowledgments preserve newer selections and rewards', () => {
  let snapshot = createSnapshot({ state: createGame(), version: 0 });
  const complete = action('task.complete', { taskId: 'starter-1' });
  snapshot = enqueue(snapshot, complete).snapshot;
  snapshot.queue[0].sent = true;
  const theme = action('settings.update', {
    settings: { ...snapshot.base.settings, theme: 'dark' },
  });
  snapshot = enqueue(snapshot, theme).snapshot;
  const chami = action('pet.switch', { species: 'chami' });
  snapshot = enqueue(snapshot, chami).snapshot;
  assert.equal(projectedState(snapshot).coins, 80);
  assert.equal(projectedState(snapshot).settings.theme, 'dark');
  assert.equal(projectedState(snapshot).pet.name, 'Chami');
  const saved = applyAction(snapshot.base, complete).state;
  snapshot = reconcile(snapshot, { state: saved, version: 1 }, complete.id).snapshot;
  assert.equal(projectedState(snapshot).coins, 80);
  assert.equal(projectedState(snapshot).pet.species, 'chami');
  assert.equal(projectedState(snapshot).settings.theme, 'dark');
  assert.throws(() => enqueue(snapshot, complete), /already earned/);
});
test('only unsent presentation commands merge; uncertain IDs survive reload unchanged', () => {
  let snapshot = createSnapshot({ state: createGame(), version: 0 });
  const first = action('pet.switch', { species: 'pip' });
  snapshot = enqueue(snapshot, first).snapshot;
  snapshot.queue[0].sent = true;
  snapshot = enqueue(snapshot, action('pet.switch', { species: 'nori' })).snapshot;
  const final = action('pet.switch', { species: 'chami' });
  snapshot = enqueue(snapshot, final).snapshot;
  const restored = JSON.parse(JSON.stringify(snapshot));
  assert.equal(restored.queue.length, 2);
  assert.equal(restored.queue[0].action.id, first.id);
  assert.equal(restored.queue[1].action.id, final.id);
  assert.equal(projectedState(restored).pet.name, 'Chami');
});
test('food is projected once after a lost response and a completed-operation retry', () => {
  let snapshot = createSnapshot({ state: createGame(), version: 0 });
  const feed = action('item.care', { itemId: 'berry' });
  snapshot = enqueue(snapshot, feed).snapshot;
  snapshot.queue[0].sent = true;
  assert.equal(projectedState(JSON.parse(JSON.stringify(snapshot))).inventory.berry, 1);
  const saved = applyAction(snapshot.base, feed).state;
  snapshot = reconcile(snapshot, { state: saved, version: 1 }, feed.id).snapshot;
  assert.equal(snapshot.queue.length, 0);
  assert.equal(projectedState(snapshot).inventory.berry, 1);
  assert.equal(projectedState(snapshot).careCount, 1);
});
test('canonical changes reject dependent unsent commands and stale responses cannot undo state', () => {
  let snapshot = createSnapshot({ state: createGame(), version: 0 });
  const task = action('task.complete', { taskId: 'starter-1' });
  snapshot = enqueue(snapshot, task).snapshot;
  snapshot.queue[0].sent = true;
  snapshot = enqueue(snapshot, action('item.buy', { itemId: 'plant' })).snapshot;
  const server = applyAction(snapshot.base, task).state;
  server.coins = 0;
  const result = reconcile(snapshot, { state: server, version: 2 }, task.id);
  assert.equal(result.snapshot.queue.length, 0);
  assert.equal(result.rejected.length, 1);
  const stale = reconcile(result.snapshot, { state: createGame(), version: 0 });
  assert.equal(stale.snapshot.version, 2);
  assert.equal(stale.snapshot.base.coins, 0);
});
test('database failures differ from expired and invalid authentication tokens', () => {
  for (const code of ['ECONNRESET', 'ETIMEDOUT', '57P01', 'ERR_JWKS_TIMEOUT'])
    assert.equal(authServiceUnavailable({ code }), true);
  for (const code of [
    'ERR_JWT_EXPIRED',
    'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
    'ERR_JWT_CLAIM_VALIDATION_FAILED',
  ])
    assert.equal(authServiceUnavailable({ code }), false);
});
