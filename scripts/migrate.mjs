import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
const connectionString = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL_DIRECT in .env.local.');
if (new URL(connectionString).hostname.includes('-pooler'))
  throw new Error('Use a direct connection for migrations.');
const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query('begin');
  const directory = new URL('../neon/', import.meta.url);
  for (const file of (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort())
    await client.query(await readFile(new URL(file, directory), 'utf8'));
  await client.query('commit');
  console.log('Pocket Quest schema applied.');
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end();
}
