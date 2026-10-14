import pg from 'pg';

// Credentials are supplied once via the process environment, never shipped to browsers.
const email = process.env.POCKET_QUEST_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.POCKET_QUEST_ADMIN_PASSWORD;
if (!email || !password || password.length < 8)
  throw new Error(
    'Set POCKET_QUEST_ADMIN_EMAIL and POCKET_QUEST_ADMIN_PASSWORD (at least 8 characters).',
  );
if (!process.env.NEON_AUTH_BASE_URL || !process.env.DATABASE_URL)
  throw new Error('Configure Neon in .env.local first.');
const endpoint = process.env.NEON_AUTH_BASE_URL.replace(/\/$/, '');
const origin = process.env.POCKET_QUEST_TEST_URL || 'http://127.0.0.1:5175';
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL,
});
let sessionCookies = '';
async function auth(path, body) {
  const response = await fetch(`${endpoint}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const cookies = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
  if (cookies) sessionCookies = cookies;
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      `Account setup failed (${response.status}): ${data.message || 'Please check account configuration.'}`,
    );
  return data;
}
try {
  await client.connect();
  const existing = await client.query('select id from neon_auth."user" where lower(email)=$1', [
    email,
  ]);
  if (!existing.rows.length)
    await auth('sign-up/email', { email, password, name: 'Pocket Quest Admin' });
  // Verify the requested password through managed auth before granting membership.
  const login = await auth('sign-in/email', { email, password });
  if (!login.user?.id || login.user.email.toLowerCase() !== email)
    throw new Error('Could not verify the admin account.');
  await client.query(
    'insert into pocketquest.test_admins(owner_id) values($1) on conflict do nothing',
    [login.user.id],
  );
  console.log(`Test admin ready: ${email}. Use the profile menu → Test controls after signing in.`);
} finally {
  if (sessionCookies)
    await fetch(`${endpoint}/sign-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: sessionCookies },
      body: '{}',
      signal: AbortSignal.timeout(10000),
    }).catch(() => {});
  await client.end();
}
