import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createGame, applyAction } from '../../shared/game.js';

test('a new worker replaces a legacy cached app without closing tabs or losing progress and drafts', async ({
  page,
}) => {
  test.skip(process.env.RUN_PWA_E2E !== '1', 'Requires a production build in dist.');
  test.setTimeout(45000);
  let legacy = true;
  const root = resolve('dist');
  let state = createGame(),
    version = 1;
  const user = { id: 'updates-qa', name: 'Update QA', email: 'updates@example.invalid' };
  const token = `e30.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
  const originalWorker = `
      self.addEventListener('install', event => event.waitUntil(caches.open('qa-legacy-app').then(cache => cache.add('/index.html'))));
      self.addEventListener('fetch', event => {
        if (event.request.mode === 'navigate') event.respondWith(caches.match('/index.html').then(cached => cached || fetch(event.request)));
      });
    `;
  // Worker script updates bypass page.route, so serve two real worker versions.
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/api/auth/get-session') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ user }));
    }
    if (pathname === '/api/auth/token') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ token }));
    }
    if (pathname === '/api/game') {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        state = applyAction(state, JSON.parse(body)).state;
        version++;
      }
      return res.end(JSON.stringify({ state, version }));
    }
    if (pathname === '/sw.js' && legacy) {
      res.setHeader('Content-Type', 'application/javascript');
      return res.end(originalWorker);
    }
    let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep)) {
      res.statusCode = 404;
      return res.end();
    }
    try {
      let data;
      try {
        data = await readFile(file);
      } catch {
        if (extname(file)) throw new Error('Missing asset');
        file = resolve(root, 'index.html');
        data = await readFile(file);
      }
      const types = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.webp': 'image/webp',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.webmanifest': 'application/manifest+json',
      };
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      res.end(data);
    } catch {
      console.log('Missing production asset:', pathname);
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await page.goto(origin);
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page
      .getByRole('button', { name: 'Complete Make space for one important thing', exact: true })
      .click();
    await expect(page.locator('.wallet-pill strong')).toHaveText('80');
    await page.getByRole('button', { name: 'New task', exact: true }).click();
    await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Keep this draft');
    legacy = false;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(
              new Error(
                `The new worker did not take control: ${JSON.stringify({ installing: registration.installing?.state, waiting: registration.waiting?.state, active: registration.active?.state })}`,
              ),
            ),
          20000,
        );
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        registration.update().catch(reject);
      });
    });
    await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue(
      'Keep this draft',
    );
    expect(
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting),
    ).toBe(null);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('.wallet-pill strong')).toHaveText('80');
    await page.goto(`${origin}/login`);
    await expect(page.getByRole('link', { name: 'Open my day', exact: true })).toBeVisible();
    await expect(
      page.getByText('Sign-in is unavailable. Please try again later.'),
    ).not.toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
