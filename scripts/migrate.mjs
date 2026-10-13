import pg from 'pg';
import { readFile } from 'node:fs/promises';
const connectionString = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL_DIRECT in .env.local.');
if (new URL(connectionString).hostname.includes('-pooler'))
  throw new Error('Use a direct connection for migrations.');
const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query('begin');
  await client.query(await readFile(new URL('../neon/001_game.sql', import.meta.url), 'utf8'));
  await client.query('commit');
  console.log('Pocket Quest schema applied.');
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end();
}
