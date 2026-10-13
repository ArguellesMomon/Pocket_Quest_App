export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!process.env.NEON_AUTH_BASE_URL)
    return res.status(503).json({ error: 'Accounts are not connected yet.' });
  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ error: 'Method not supported.' });
  const incoming = new URL(req.url, 'http://localhost');
  const routed = req.query?.path || incoming.searchParams.get('path');
  const path = incoming.pathname.startsWith('/api/auth/')
    ? incoming.pathname.slice(10)
    : Array.isArray(routed)
      ? routed.join('/')
      : routed;
  if (typeof path !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path))
    return res.status(400).json({ error: 'Invalid account request.' });
  incoming.searchParams.delete('path');
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  if (req.headers.origin) headers.Origin = req.headers.origin;
  const body =
    req.method === 'POST'
      ? typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body || {})
      : undefined;
  if (body && Buffer.byteLength(body) > 12000)
    return res.status(413).json({ error: 'Request too large.' });
  try {
    const search = incoming.searchParams.toString();
    const response = await fetch(
      `${process.env.NEON_AUTH_BASE_URL.replace(/\/$/, '')}/${path}${search ? `?${search}` : ''}`,
      { method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) },
    );
    const cookies = response.headers
      .getSetCookie()
      .map((cookie) =>
        cookie.replace(/;\s*Domain=[^;]+/gi, '').replace(/;\s*Path=[^;]+/gi, '; Path=/'),
      );
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    for (const key of ['content-type', 'set-auth-jwt']) {
      const value = response.headers.get(key);
      if (value) res.setHeader(key, value);
    }
    const destination = response.headers.get('location');
    if (destination) {
      const url = new URL(destination, process.env.NEON_AUTH_BASE_URL);
      const appOrigin =
        req.headers.origin || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      if (url.origin !== new URL(appOrigin).origin)
        return res.status(400).json({ error: 'Unexpected account redirect.' });
      res.setHeader('Location', url.href);
    }
    res.statusCode = response.status;
    res.end(await response.text());
  } catch {
    res
      .status(503)
      .json({ error: 'The account service is temporarily unavailable. Please retry.' });
  }
}
