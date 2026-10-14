import { withOwner } from '../server/database.js';
import { requireIdentity } from '../server/identity.js';
import { requireAdmin, mutateAdminGame } from '../server/admin-store.js';
import { loadGame } from '../server/game-store.js';

export function adminHandler({
  identity = requireIdentity,
  authorize = requireAdmin,
  transaction = withOwner,
} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'POST'].includes(req.method))
      return res.status(405).json({ error: 'Method not supported.' });
    try {
      const { owner, name } = await identity(req);
      await authorize(owner);
      if (req.method === 'GET')
        return res
          .status(200)
          .json(await transaction(owner, (client) => loadGame(client, owner, name)));
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      if (Buffer.byteLength(raw) > 2000)
        return res.status(413).json({ error: 'This request is too large.' });
      let request;
      try {
        request = JSON.parse(raw);
      } catch {
        return res.status(400).json({ error: 'Invalid request.' });
      }
      if (
        !request ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.id || '')
      )
        return res.status(400).json({ error: 'Invalid action ID.' });
      // The target always comes from the verified session, never from the request body.
      return res
        .status(200)
        .json(await transaction(owner, (client) => mutateAdminGame(client, owner, request)));
    } catch (error) {
      const unavailable = Boolean(error.code || /connect|database|timeout/i.test(error.message));
      return res
        .status(error.status || (unavailable ? 503 : 400))
        .json({
          error: unavailable
            ? 'Test controls are temporarily unavailable. Please try again.'
            : error.message,
        });
    }
  };
}
export default adminHandler();
