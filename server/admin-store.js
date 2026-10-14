import { SPECIES, petStats, upgradeGame } from '../shared/game.js';
import { database } from './database.js';
import { loadGame } from './game-store.js';

export async function hasAdminAccess(owner, pool = database()) {
  const { rows } = await pool.query(
    'select owner_id from pocketquest.test_admins where owner_id=$1',
    [owner],
  );
  return rows.length > 0;
}
export async function requireAdmin(owner, pool = database()) {
  if (!(await hasAdminAccess(owner, pool)))
    throw Object.assign(new Error('This account does not have test admin access.'), {
      status: 403,
    });
}
export function testValues(state, now = Date.now()) {
  return { coins: state.coins, xp: state.xp, species: state.pet.species, ...petStats(state, now) };
}
export function applyTestValues(current, values, now = Date.now()) {
  if (!values || typeof values !== 'object' || Array.isArray(values))
    throw new Error('Choose test values.');
  if (Object.keys(values).some((key) => !['coins', 'xp', 'species', 'energy', 'joy'].includes(key)))
    throw new Error('Unsupported test field.');
  for (const [key, max, min] of [
    ['coins', 1000000, 0],
    ['xp', 150000, 0],
    ['energy', 100, 20],
    ['joy', 100, 20],
  ])
    if (!Number.isInteger(values[key]) || values[key] < min || values[key] > max)
      throw new Error(`${key} must be a whole number between ${min} and ${max}.`);
  const companion = SPECIES.find((pet) => pet.id === values.species);
  if (!companion) throw new Error('Choose a valid companion.');
  const state = upgradeGame(current);
  state.coins = values.coins;
  state.xp = values.xp;
  if (state.pet.species !== companion.id) state.pet.name = companion.name;
  Object.assign(state.pet, {
    species: companion.id,
    energy: values.energy,
    joy: values.joy,
    updatedAt: now,
  });
  delete state.pet.lastInteraction;
  return state;
}
export async function mutateAdminGame(client, owner, request, now = Date.now()) {
  const game = await loadGame(client, owner);
  const prior = await client.query(
    'select operation_id from pocketquest.admin_edits where owner_id=$1 and operation_id=$2',
    [owner, request.id],
  );
  if (prior.rows.length) return { ...game, message: 'Test progress saved.' };
  if (!Number.isInteger(request.version) || request.version !== game.version)
    throw Object.assign(new Error('Progress changed. Reload the test values before saving.'), {
      status: 409,
    });
  const state = applyTestValues(game.state, request.values, now);
  const { rows } = await client.query(
    'update pocketquest.games set state=$2,version=version+1,updated_at=now() where owner_id=$1 returning state,version',
    [owner, JSON.stringify(state)],
  );
  await client.query(
    'insert into pocketquest.admin_edits(owner_id,operation_id,before_values,after_values) values($1,$2,$3,$4)',
    [
      owner,
      request.id,
      JSON.stringify(testValues(game.state, now)),
      JSON.stringify(testValues(state, now)),
    ],
  );
  return { ...rows[0], message: 'Test progress saved.' };
}
