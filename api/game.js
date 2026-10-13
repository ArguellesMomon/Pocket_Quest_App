import { createRemoteJWKSet, jwtVerify } from 'jose';
import { database, withOwner } from '../server/database.js';
import { loadGame, mutateGame } from '../server/game-store.js';
import { authServiceUnavailable } from '../server/auth-errors.js';
let keys, keyUrl;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ error: 'Method not supported.' });
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.DATABASE_URL)
    return res
      .status(503)
      .json({ error: 'Account sync is not configured. Guest adventures are available.' });
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  let owner, ownerName;
  try {
    const url = process.env.NEON_AUTH_JWKS_URL;
    if (!url) throw new Error('Missing JWKS.');
    if (url !== keyUrl) {
      keys = createRemoteJWKSet(new URL(url));
      keyUrl = url;
    }
    const origin = new URL(process.env.NEON_AUTH_BASE_URL).origin;
    const { payload } = await jwtVerify(token, keys, {
      issuer: origin,
      audience: origin,
      algorithms: ['EdDSA'],
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    if (payload.role !== 'authenticated' || payload.banned || !payload.sub)
      throw new Error('Invalid identity.');
    const { rows } = await database().query(
      'select id,name,banned,"banExpires" from neon_auth."user" where id=$1',
      [payload.sub],
    );
    if (
      !rows.length ||
      (rows[0].banned && (!rows[0].banExpires || new Date(rows[0].banExpires) > new Date()))
    )
      throw new Error('Inactive account.');
    owner = payload.sub;
    ownerName = rows[0].name;
  } catch (error) {
    if (authServiceUnavailable(error))
      return res.status(503).json({ error: 'Sync is temporarily unavailable. Please try again.' });
    return res.status(401).json({ error: 'Your session has ended. Please sign in again.' });
  }
  try {
    if (req.method === 'GET')
      return res.status(200).json(await withOwner(owner, (c) => loadGame(c, owner, ownerName)));
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw) > 12000)
      return res.status(413).json({ error: 'This request is too large.' });
    let action;
    try {
      action = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(action.id || ''))
      return res.status(400).json({ error: 'Invalid action ID.' });
    return res.status(200).json(await withOwner(owner, (c) => mutateGame(c, owner, action)));
  } catch (error) {
    const unavailable = Boolean(error.code || /connect|database|timeout/i.test(error.message));
    return res.status(unavailable ? 503 : 400).json({
      error: unavailable ? 'Sync is temporarily unavailable. Please try again.' : error.message,
    });
  }
}
