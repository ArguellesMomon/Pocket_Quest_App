import { createGame, applyAction } from '../../shared/game.js';
const KEY = 'pocketquest-test-state';
export async function mockAccount(
  page,
  context = page.context(),
  { state = createGame(), signedIn = true, owner = 'design-qa' } = {},
) {
  const user = { id: owner, name: state.name, email: 'design@example.invalid' };
  const data = {
    state,
    signedIn,
    version: 1,
    posts: [],
    authPosts: [],
    failAuth: false,
    ledger: new Map(),
    driver: JSON.stringify(state),
  };
  const token = `e30.${Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  await page.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    },
    { state, key: KEY },
  );
  await context.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: data.signedIn ? { user } : null }),
  );
  await context.route('**/api/auth/token', (route) => route.fulfill({ json: { token } }));
  for (const path of ['sign-in/email', 'sign-up/email'])
    await context.route(`**/api/auth/${path}`, (route) => {
      data.authPosts.push(route.request().postDataJSON());
      if (data.failAuth)
        return route.fulfill({ status: 401, json: { message: 'Email or password is incorrect.' } });
      data.signedIn = true;
      return route.fulfill({ json: { user, token: 'test-session' } });
    });
  await context.route('**/api/auth/sign-out', (route) => {
    data.signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await context.route('**/api/game', async (route) => {
    if (route.request().method() === 'GET') {
      const driver = await page.evaluate((key) => localStorage.getItem(key), KEY).catch(() => null);
      if (driver && driver !== data.driver) {
        data.state = JSON.parse(driver);
        data.driver = driver;
        data.version++;
      }
    }
    if (route.request().method() === 'POST') {
      const action = route.request().postDataJSON();
      data.posts.push(action);
      if (!data.ledger.has(action.id)) {
        const result = applyAction(data.state, action);
        data.state = result.state;
        data.version++;
        data.ledger.set(action.id, result.message);
      }
      return route.fulfill({
        json: {
          state: data.state,
          version: data.version,
          message: data.ledger.get(action.id),
          admin: false,
        },
      });
    }
    return route.fulfill({ json: { state: data.state, version: data.version, admin: false } });
  });
  return data;
}
