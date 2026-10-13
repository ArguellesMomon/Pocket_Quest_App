import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

test('a new worker replaces a legacy cached app without closing tabs or losing progress and drafts', async ({
  page,
}) => {
  test.skip(process.env.RUN_PWA_E2E !== '1', 'Requires a production build in dist.');
  test.setTimeout(45000);
  let legacy = true;
  const root = resolve('dist');
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
      return res.end('null');
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
    await page.getByRole('button', { name: /Let.s play/ }).click();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page
      .getByRole('button', { name: 'Complete Make space for one important thing', exact: true })
      .click();
    await expect(page.locator('.wallet-pill strong')).toHaveText('80');
    await page.getByRole('button', { name: 'Add a quest', exact: true }).click();
    await page.getByRole('textbox', { name: 'Quest', exact: true }).fill('Keep this draft');
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
    await expect(page.getByRole('textbox', { name: 'Quest', exact: true })).toHaveValue(
      'Keep this draft',
    );
    expect(
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting),
    ).toBe(null);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('.wallet-pill strong')).toHaveText('80');
    await page.goto(`${origin}/login`);
    await expect(
      page.getByRole('button', { name: 'Continue adventure', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Cloud accounts are not connected. Guest mode is fully playable.'),
    ).not.toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
