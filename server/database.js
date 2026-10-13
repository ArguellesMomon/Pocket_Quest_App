import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
let pool;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured.');
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 15000,
    });
    if (process.env.VERCEL) attachDatabasePool(pool);
    pool.on('error', () => {});
  }
  return pool;
}
export async function withOwner(owner, callback, suppliedPool = database()) {
  const client = await suppliedPool.connect();
  try {
    await client.query('begin');
    await client.query('set local role pocketquest_app');
    await client.query("select set_config('pocketquest.owner_id', $1, true)", [owner]);
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
