import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createGame, petStats } from '../shared/game.js';
import {
  applyTestValues,
  hasAdminAccess,
  requireAdmin,
  mutateAdminGame,
} from '../server/admin-store.js';
import { loadGame, mutateGame } from '../server/game-store.js';
import { adminHandler } from '../api/admin.js';

test('test edits validate bounded fields, preserve quests/inventory, and make moods immediate', () => {
  const original = createGame('cat', 1000);
  original.pet.lastInteraction = { kind: 'food', at: 2000 };
  const values = { coins: 5000, xp: 600, species: 'samo', energy: 20, joy: 100 };
  const result = applyTestValues(original, values, 3000);
  assert.equal(result.pet.name, 'Finn');
  assert.equal(result.pet.lastInteraction, undefined);
  assert.deepEqual(petStats(result, 3000), { energy: 20, joy: 100 });
  assert.deepEqual(result.tasks, original.tasks);
  assert.deepEqual(result.inventory, original.inventory);
  assert.equal(original.coins, 60);
  for (const patch of [
    { coins: -1 },
    { coins: 1000001 },
    { xp: 0.1 },
    { xp: '600' },
    { energy: 0 },
    { joy: 101 },
    { species: 'unknown' },
    { settings: {} },
  ])
    assert.throws(() => applyTestValues(original, { ...values, ...patch }));
});
test('API rejects non-admin identities before touching progress and never accepts a target owner', async () => {
  const denied = adminHandler({
    identity: async () => ({ owner: 'ordinary' }),
    authorize: async () => {
      throw Object.assign(new Error('Denied'), { status: 403 });
    },
    transaction: () => {
      throw new Error('Must not run');
    },
  });
  function response() {
    return {
      setHeader() {},
      status(code) {
        this.code = code;
        return this;
      },
      json(data) {
        this.data = data;
        return this;
      },
    };
  }
  for (const method of ['GET', 'POST']) {
    const res = response();
    await denied({ method, body: { admin: true, email: 'admin@pocket.com' } }, res);
    assert.equal(res.code, 403);
  }
  let target;
  const allowed = adminHandler({
    identity: async () => ({ owner: 'admin' }),
    authorize: async () => {},
    transaction: async (owner) => {
      target = owner;
      return { version: 2 };
    },
  });
  const res = response();
  await allowed(
    { method: 'POST', body: { id: crypto.randomUUID(), owner: 'victim', version: 1, values: {} } },
    res,
  );
  assert.equal(target, 'admin');
  assert.equal(res.code, 200);
});
test('admin membership cannot be self-assigned, edits are audited/idempotent, and stale saves cannot overwrite rewards', async () => {
  const db = new PGlite();
  const adminId = crypto.randomUUID(),
    ordinaryId = crypto.randomUUID();
  try {
    await db.exec('create schema neon_auth; create table neon_auth."user" (id uuid primary key);');
    await db.query('insert into neon_auth."user" values ($1),($2)', [adminId, ordinaryId]);
    for (const file of ['001_game.sql', '003_admin.sql'])
      await db.exec(await readFile(new URL(`../neon/${file}`, import.meta.url), 'utf8'));
    const client = { query: (sql, params) => db.query(sql, params) };
    await db.query('insert into pocketquest.test_admins(owner_id) values($1)', [adminId]);
    assert.equal(await hasAdminAccess(ordinaryId, client), false);
    await assert.rejects(requireAdmin(ordinaryId, client), (e) => e.status === 403);
    await requireAdmin(adminId, client);
    async function owner(id, run) {
      await db.exec('begin; set local role pocketquest_app;');
      await db.query("select set_config('pocketquest.owner_id',$1,true)", [id]);
      try {
        const result = await run();
        await db.exec('commit');
        return result;
      } catch (e) {
        await db.exec('rollback');
        throw e;
      }
    }
    await assert.rejects(
      owner(ordinaryId, () =>
        client.query('insert into pocketquest.test_admins(owner_id) values($1)', [ordinaryId]),
      ),
      /permission denied/,
    );
    await assert.rejects(
      owner(ordinaryId, () => client.query('select * from pocketquest.test_admins')),
      /permission denied/,
    );
    const initial = await owner(adminId, () => loadGame(client, adminId));
    const command = {
      id: crypto.randomUUID(),
      version: initial.version,
      values: { coins: 1234, xp: 450, species: 'chami', energy: 45, joy: 70 },
    };
    const first = await owner(adminId, () => mutateAdminGame(client, adminId, command, 1000));
    const again = await owner(adminId, () => mutateAdminGame(client, adminId, command, 2000));
    assert.equal(again.version, first.version);
    assert.equal(first.state.coins, 1234);
    const audit = await owner(adminId, () =>
      client.query('select before_values,after_values from pocketquest.admin_edits'),
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].before_values.coins, 60);
    assert.equal(audit.rows[0].after_values.coins, 1234);
    assert.equal(
      (await owner(ordinaryId, () => client.query('select * from pocketquest.admin_edits'))).rows
        .length,
      0,
    );
    await owner(adminId, () =>
      mutateGame(
        client,
        adminId,
        { id: crypto.randomUUID(), type: 'task.complete', taskId: 'starter-1' },
        3000,
      ),
    );
    await assert.rejects(
      owner(adminId, () =>
        mutateAdminGame(client, adminId, {
          ...command,
          id: crypto.randomUUID(),
          version: first.version,
        }),
      ),
      (e) => e.status === 409,
    );
    assert.equal((await owner(adminId, () => loadGame(client, adminId))).state.coins, 1254);
    await assert.rejects(
      owner(ordinaryId, () =>
        mutateGame(client, ordinaryId, {
          id: crypto.randomUUID(),
          type: 'admin.set',
          ...command.values,
        }),
      ),
      /action/i,
    );
  } finally {
    await db.close();
  }
});
