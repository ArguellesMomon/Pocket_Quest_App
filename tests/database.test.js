import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { loadGame, mutateGame } from '../server/game-store.js';
test('the SQL migration isolates owners, mutation retries are idempotent, and failures roll back', async () => {
  const db = new PGlite();
  await db.exec(await readFile(new URL('../neon/001_game.sql', import.meta.url), 'utf8'));
  const client = { query: (sql, values) => db.query(sql, values) };
  async function owner(id, fn) {
    await db.exec('begin; set local role pocketquest_app;');
    await db.query("select set_config('pocketquest.owner_id',$1,true)", [id]);
    try {
      const result = await fn();
      await db.exec('commit');
      return result;
    } catch (e) {
      await db.exec('rollback');
      throw e;
    }
  }
  await owner('alice', () => loadGame(client, 'alice'));
  await owner('bob', () => loadGame(client, 'bob'));
  const op = { id: crypto.randomUUID(), type: 'task.complete', taskId: 'starter-1' };
  const first = await owner('alice', () => mutateGame(client, 'alice', op));
  const second = await owner('alice', () => mutateGame(client, 'alice', op));
  assert.equal(first.state.coins, 80);
  assert.equal(second.state.coins, 80);
  assert.equal(second.version, first.version);
  await owner('bob', async () => {
    const { rows } = await client.query('select owner_id from pocketquest.games');
    assert.deepEqual(rows, [{ owner_id: 'bob' }]);
    assert.equal((await loadGame(client, 'bob')).state.coins, 60);
  });
  await assert.rejects(
    owner('bob', () =>
      client.query('insert into pocketquest.games(owner_id,state) values($1,$2)', ['eve', '{}']),
    ),
    /row-level security/,
  );
  await assert.rejects(
    owner('alice', () =>
      mutateGame(client, 'alice', { id: crypto.randomUUID(), type: 'item.buy', itemId: 'cloud' }),
    ),
    /level 4/,
  );
  const final = await owner('alice', () => loadGame(client, 'alice'));
  assert.equal(final.state.coins, 80);
  assert.equal(final.version, first.version);
  const care = { id: crypto.randomUUID(), type: 'item.care', itemId: 'berry' };
  const careFirst = await owner('alice', () => mutateGame(client, 'alice', care));
  const careRetry = await owner('alice', () => mutateGame(client, 'alice', care));
  assert.equal(careFirst.state.inventory.berry, 1);
  assert.equal(careRetry.state.inventory.berry, 1);
  assert.equal(careRetry.state.careCount, 1);
  assert.equal(careRetry.version, careFirst.version);
  await db.close();
});
