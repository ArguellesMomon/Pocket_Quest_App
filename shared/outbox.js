import { applyAction, upgradeGame } from './game.js';

export function createSnapshot(result) {
  return {
    schema: 1,
    base: upgradeGame(result.state),
    version: result.version || 0,
    queue: [],
    attempts: 0,
    refresh: false,
  };
}
export function projectedState(snapshot) {
  return snapshot.queue.reduce((state, entry) => {
    try {
      return applyAction(state, entry.action, entry.at).state;
    } catch {
      return state;
    } // A dependent action may become invalid after a rejection; rebase removes it.
  }, upgradeGame(snapshot.base));
}
export function enqueue(snapshot, action, at = Date.now()) {
  const result = applyAction(projectedState(snapshot), action, at);
  const next = structuredClone(snapshot);
  const last = next.queue.at(-1);
  // Never change a submitted operation ID. Only merge unsent presentation changes.
  if (
    last &&
    !last.sent &&
    last.action.type === action.type &&
    ['settings.update', 'pet.switch'].includes(action.type)
  )
    next.queue[next.queue.length - 1] = { action, at, sent: false };
  else {
    if (next.queue.length >= 100)
      throw new Error('Reconnect to save your queued changes before adding more.');
    next.queue.push({ action, at, sent: false });
  }
  return { snapshot: next, message: result.message };
}
export function reconcile(snapshot, result, operationId) {
  const next = structuredClone(snapshot);
  if (operationId && next.queue.length && next.queue[0].action.id !== operationId)
    return { snapshot: next, rejected: [] };
  if (operationId && next.queue[0]?.action.id === operationId) next.queue.shift();
  if (result.version >= next.version) {
    next.base = upgradeGame(result.state);
    next.version = result.version;
  }
  let state = upgradeGame(next.base);
  const rejected = [];
  next.queue = next.queue.filter((entry) => {
    try {
      state = applyAction(state, entry.action, entry.at).state;
      return true;
    } catch (error) {
      if (entry.sent) return true;
      rejected.push(error.message);
      return false;
    }
  });
  next.attempts = 0;
  next.refresh = false;
  return { snapshot: next, rejected };
}
