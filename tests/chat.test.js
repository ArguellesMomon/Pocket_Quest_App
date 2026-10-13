import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createGame } from '../shared/game.js';
import { PERSONALITIES } from '../shared/chat.js';
import { SELECTABLE_COMPANIONS } from '../shared/companions.js';
import { loadGame } from '../server/game-store.js';
import {
  reserveChat,
  finishChat,
  readChat,
  clearChat,
  releaseChat,
  validateSend,
} from '../server/chat-store.js';
import { buildChatMessages, generateChat } from '../server/chat-provider.js';
import chatHandler from '../api/chat.js';

test('chat histories and memory isolate owners and characters; retries, leases, clearing, pagination and quotas are safe', async () => {
  const db = new PGlite();
  try {
    for (const file of ['001_game.sql', '002_chat.sql'])
      await db.exec(await readFile(new URL(`../neon/${file}`, import.meta.url), 'utf8'));
    // Migrations remain safe to run again.
    await db.exec(await readFile(new URL('../neon/002_chat.sql', import.meta.url), 'utf8'));
    const client = { query: (sql, values) => db.query(sql, values) };
    async function owner(id, fn) {
      await db.exec('begin; set local role pocketquest_app;');
      await db.query("select set_config('pocketquest.owner_id',$1,true)", [id]);
      try {
        const result = await fn();
        await db.exec('commit');
        return result;
      } catch (error) {
        await db.exec('rollback');
        throw error;
      }
    }
    await owner('alice', () => loadGame(client, 'alice'));
    await owner('bob', () => loadGame(client, 'bob'));
    const now = Date.parse('2026-10-13T12:00:00Z');
    const message = (character, text = 'I finished my task') => ({
      id: crypto.randomUUID(),
      character,
      message: text,
    });
    const finn = message('samo');
    const first = await owner('alice', () => reserveChat(client, 'alice', finn, now, 3));
    assert.equal(first.summary, '');
    await assert.rejects(
      owner('alice', () => reserveChat(client, 'alice', message('chami'), now + 1000, 3)),
      /still replying/,
    );
    const saved = await owner('alice', () =>
      finishChat(
        client,
        'alice',
        finn,
        first.token,
        { reply: 'Victory lap!', summary: 'User finished a task.' },
        now + 2000,
      ),
    );
    assert.equal(saved.turns[0].reply, 'Victory lap!');
    assert.equal(
      (await owner('alice', () => reserveChat(client, 'alice', finn, now + 3000, 3))).complete,
      true,
    );
    await assert.rejects(
      owner('alice', () =>
        reserveChat(client, 'alice', { ...finn, character: 'chami' }, now + 4000, 3),
      ),
      /already used/,
    );
    await assert.rejects(
      owner('alice', () => reserveChat(client, 'alice', message('chami'), now + 4000, 3)),
      /wait a few seconds/,
    );
    const chami = message('chami');
    const second = await owner('alice', () => reserveChat(client, 'alice', chami, now + 7000, 3));
    assert.equal(second.summary, '');
    assert.equal(second.turns.length, 0);
    await owner('alice', () =>
      finishChat(
        client,
        'alice',
        chami,
        second.token,
        { reply: 'Purrfect.', summary: 'Chami knows about a win.' },
        now + 8000,
      ),
    );
    assert.equal(
      (await owner('bob', () => readChat(client, 'bob', 'samo', null, now))).turns.length,
      0,
    );
    await assert.rejects(
      owner('bob', () =>
        client.query(
          'insert into pocketquest.chat_conversations(owner_id,character_id) values($1,$2)',
          ['alice', 'nori'],
        ),
      ),
      /row-level security/,
    );
    const next = message('samo', 'What should I do next?');
    const third = await owner('alice', () => reserveChat(client, 'alice', next, now + 14000, 3));
    assert.equal(third.summary, 'User finished a task.');
    assert.equal(third.turns.length, 1);
    await owner('alice', () => clearChat(client, 'alice', 'samo'));
    await assert.rejects(
      owner('alice', () =>
        finishChat(
          client,
          'alice',
          next,
          third.token,
          { reply: 'Late reply', summary: 'Late memory' },
          now + 15000,
        ),
      ),
      /conversation changed/,
    );
    assert.equal(
      (await owner('alice', () => readChat(client, 'alice', 'samo', null, now))).turns.length,
      0,
    );
    assert.equal(
      (await owner('alice', () => readChat(client, 'alice', 'chami', null, now))).turns.length,
      1,
    );
    await assert.rejects(
      owner('alice', () => reserveChat(client, 'alice', message('samo'), now + 21000, 3)),
      /today’s companion messages/,
    );
    const tomorrow = now + 86400000;
    const abandoned = await owner('alice', () =>
      reserveChat(client, 'alice', message('samo'), tomorrow, 3),
    );
    const renewedInput = message('samo');
    const renewed = await owner('alice', () =>
      reserveChat(client, 'alice', renewedInput, tomorrow + 91000, 3),
    );
    await owner('alice', () => releaseChat(client, 'alice', abandoned.token));
    await owner('alice', () =>
      finishChat(
        client,
        'alice',
        renewedInput,
        renewed.token,
        { reply: 'Fresh start', summary: '' },
        tomorrow + 92000,
      ),
    );
    await owner('alice', async () => {
      for (let i = 0; i < 23; i++)
        await client.query(
          'insert into pocketquest.chat_turns(owner_id,character_id,request_id,user_text,reply) values($1,$2,$3,$4,$5)',
          ['alice', 'samo', crypto.randomUUID(), `Message ${i}`, `Reply ${i}`],
        );
      const page = await readChat(client, 'alice', 'samo');
      assert.equal(page.turns.length, 20);
      assert.ok(page.before);
      const older = await readChat(client, 'alice', 'samo', page.before);
      assert.equal(older.turns.length, 4);
      assert.equal(older.before, null);
      assert.ok(BigInt(older.turns.at(-1).sequence) < BigInt(page.turns[0].sequence));
      await clearChat(client, 'alice', 'samo');
      assert.equal(
        (
          await client.query('select * from pocketquest.chat_conversations where character_id=$1', [
            'samo',
          ])
        ).rows.length,
        0,
      );
    });
  } finally {
    await db.close();
  }
});

test('characters have distinct prompts; context includes only counts, mood and this character’s history', () => {
  assert.equal(new Set(SELECTABLE_COMPANIONS.map((pet) => PERSONALITIES[pet.id].voice)).size, 6);
  const state = createGame();
  state.tasks[0].title = 'Private task title';
  const reservation = {
    state,
    summary: 'Likes small steps.',
    turns: [{ message: 'Hello Finn', reply: 'Hello friend' }],
  };
  const messages = buildChatMessages({ character: 'samo', message: 'Hi again' }, reservation);
  assert.match(messages[0].content, /Finn/);
  assert.equal(messages.at(-1).content, 'Hi again');
  assert.ok(!JSON.stringify(messages).includes('Private task title'));
  assert.match(messages[1].content, /Likes small steps/);
  assert.equal(messages.length, 5);
  assert.throws(
    () => validateSend({ id: crypto.randomUUID(), character: 'unknown', message: 'Hi' }),
    /Choose a companion/,
  );
  assert.throws(
    () => validateSend({ id: crypto.randomUUID(), character: 'samo', message: 'x'.repeat(1001) }),
    /1–1000/,
  );
  assert.throws(
    () => validateSend({ id: crypto.randomUUID(), character: 'samo', message: '   ' }),
    /1–1000/,
  );
});

test('Groq requests are bounded and provider errors never expose credentials or raw output', async () => {
  const input = { character: 'chami', message: 'Hi' };
  const reservation = { state: createGame(), summary: '', turns: [] };
  const success = (reply, summary = '') => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        { finish_reason: 'stop', message: { content: JSON.stringify({ reply, summary }) } },
      ],
    }),
  });
  const result = await generateChat(input, reservation, async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.max_completion_tokens, 1400);
    assert.match(body.messages[0].content, /cheeky/);
    return success('Hello human!', 'Said hello.');
  });
  assert.deepEqual(result, { reply: 'Hello human!', summary: 'Said hello.' });
  await assert.rejects(
    generateChat(input, reservation, async () => ({ status: 429, ok: false })),
    /free AI service/,
  );
  await assert.rejects(
    generateChat(input, reservation, async () => ({ status: 401, ok: false })),
    /temporarily unavailable/,
  );
  await assert.rejects(
    generateChat(input, reservation, async () => {
      throw new Error('SECRET-KEY');
    }),
    (error) => !error.message.includes('SECRET-KEY') && error.status === 503,
  );
  await assert.rejects(
    generateChat(input, reservation, async () => success('x'.repeat(2001))),
    /train of thought/,
  );
  await assert.rejects(
    generateChat(input, reservation, async () => success('Hi', 'x'.repeat(1201))),
    /train of thought/,
  );
});

test('chat endpoint requires authentication before reading, sending or clearing', async () => {
  const original = { database: process.env.DATABASE_URL, auth: process.env.NEON_AUTH_BASE_URL };
  process.env.DATABASE_URL = 'postgres://unused';
  process.env.NEON_AUTH_BASE_URL = 'https://auth.example.invalid';
  try {
    for (const method of ['GET', 'POST', 'DELETE']) {
      const response = {
        setHeader() {},
        status(code) {
          this.code = code;
          return this;
        },
        json(body) {
          this.body = body;
        },
      };
      await chatHandler({ method, url: '/api/chat?character=samo', headers: {} }, response);
      assert.equal(response.code, 401);
      assert.match(response.body.error, /sign in/);
    }
  } finally {
    for (const [key, value] of [
      ['DATABASE_URL', original.database],
      ['NEON_AUTH_BASE_URL', original.auth],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
