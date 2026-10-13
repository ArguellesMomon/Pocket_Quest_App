import { applyAction, createGame, upgradeGame } from '../shared/game.js';
export async function loadGame(client, owner, name = 'Adventurer') {
  const initial = createGame();
  initial.name = typeof name === 'string' && name.trim() ? name.trim().slice(0, 30) : 'Adventurer';
  await client.query(
    'insert into pocketquest.games(owner_id,state) values($1,$2) on conflict do nothing',
    [owner, JSON.stringify(initial)],
  );
  const game = (
    await client.query('select state,version from pocketquest.games where owner_id=$1 for update', [
      owner,
    ])
  ).rows[0];
  return { ...game, state: upgradeGame(game.state) };
}
export async function mutateGame(client, owner, action, now = Date.now()) {
  const game = await loadGame(client, owner);
  const prior = (
    await client.query(
      'select message from pocketquest.operations where owner_id=$1 and operation_id=$2',
      [owner, action.id],
    )
  ).rows[0];
  if (prior) return { ...game, message: prior.message };
  const { state, message } = applyAction(game.state, action, now);
  const { rows } = await client.query(
    'update pocketquest.games set state=$2,version=version+1,updated_at=now() where owner_id=$1 returning state,version',
    [owner, JSON.stringify(state)],
  );
  await client.query(
    'insert into pocketquest.operations(owner_id,operation_id,message) values($1,$2,$3)',
    [owner, action.id, message],
  );
  return { ...rows[0], message };
}
