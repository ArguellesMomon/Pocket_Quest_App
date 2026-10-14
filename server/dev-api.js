import game from '../api/game.js';
import auth from '../api/auth.js';
import chat from '../api/chat.js';
import admin from '../api/admin.js';
export function localApi(environment) {
  for (const [key, value] of Object.entries(environment))
    if (!key.startsWith('VITE_') && !process.env[key]) process.env[key] = value;
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname;
      const handler =
        path === '/api/game'
          ? game
          : path === '/api/admin'
            ? admin
            : path === '/api/chat'
              ? chat
              : path === '/api/auth' || path.startsWith('/api/auth/')
                ? auth
                : null;
      if (!handler) return next();
      res.status = (status) => {
        res.statusCode = status;
        return res;
      };
      res.json = (body) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      };
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 12000)
            return res.status(413).json({ error: 'Request too large.' });
        }
        req.body = body;
        await handler(req, res);
      } catch {
        if (!res.writableEnded)
          res.status(503).json({ error: 'The service is temporarily unavailable.' });
      }
    });
  };
  return { name: 'pocketquest-api', configureServer: attach, configurePreviewServer: attach };
}
