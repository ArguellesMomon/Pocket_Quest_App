import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = process.env.POCKET_QUEST_TEST_URL || 'http://127.0.0.1:5175';
let cookies = new Map();
async function request(path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const result = await response.json();
  return { status: response.status, result };
}
const password = `Qa-${randomUUID()}-9!`;
const email = `pocketquest-qa-${Date.now()}@example.invalid`;
const signup = await request('/api/auth/sign-up/email', {
  email,
  password,
  name: 'Pocket Quest QA',
});
assert.equal(signup.status, 200, `Signup failed: ${signup.result.message || signup.result.error}`);
const userId = signup.result.user?.id;
assert.ok(userId);
const session = await request('/api/auth/get-session');
assert.equal(session.result.user?.id, userId);
const jwt = await request('/api/auth/token');
assert.equal(jwt.status, 200);
assert.ok(jwt.result.token);
const token = jwt.result.token;
const initial = await request('/api/game', null, token);
assert.equal(initial.status, 200);
assert.equal(initial.result.state.coins, 60);
const op = { id: randomUUID(), type: 'task.complete', taskId: 'starter-1' };
const completed = await request('/api/game', op, token);
assert.equal(completed.status, 200);
assert.equal(completed.result.state.coins, 80);
const retried = await request('/api/game', op, token);
assert.equal(retried.result.state.coins, 80);
assert.equal(retried.result.version, completed.result.version);
const rejected = await request('/api/game', { ...op, id: randomUUID() }, token);
assert.equal(rejected.status, 400);
await request('/api/auth/sign-out', {});
const signedOut = await request('/api/auth/get-session');
assert.ok(!signedOut.result?.user);
const login = await request('/api/auth/sign-in/email', { email, password });
assert.equal(login.status, 200);
const restoredToken = await request('/api/auth/token');
const restored = await request('/api/game', null, restoredToken.result.token);
assert.equal(restored.result.state.coins, 80);
const unauthorized = await request('/api/game');
assert.equal(unauthorized.status, 401);
const forged = await request('/api/game', null, 'not-a-jwt');
assert.equal(forged.status, 401);
await request('/api/auth/sign-out', {});
console.log(
  'Live Neon smoke passed: signup, session, JWT verification, atomic rewards, idempotent retry, duplicate rejection, signout, signin, restored progress, and unauthorized request rejection.',
);
console.log(
  'One QA account remains in the new project, with a reserved .invalid address and no email delivery.',
);
