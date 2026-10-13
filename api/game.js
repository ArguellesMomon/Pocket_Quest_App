import { withOwner } from '../server/database.js';
import { loadGame, mutateGame } from '../server/game-store.js';
import { requireIdentity } from '../server/identity.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ error: 'Method not supported.' });
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.DATABASE_URL)
    return res
      .status(503)
      .json({ error: 'Account sync is not configured. Guest adventures are available.' });
  let owner, ownerName;
  try {
    ({ owner, name: ownerName } = await requireIdentity(req));
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.message });
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
