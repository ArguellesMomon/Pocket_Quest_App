import { withOwner } from '../server/database.js';
import { requireIdentity } from '../server/identity.js';
import { chatCharacter } from '../shared/chat.js';
import {
  chatError,
  validateSend,
  readChat,
  reserveChat,
  finishChat,
  releaseChat,
  clearChat,
} from '../server/chat-store.js';
import { generateChat } from '../server/chat-provider.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST', 'DELETE'].includes(req.method))
    return res.status(405).json({ error: 'Method not supported.' });
  let owner, reservation, input;
  try {
    if (!process.env.DATABASE_URL || !process.env.NEON_AUTH_BASE_URL)
      throw chatError(503, 'Companion chat is not available yet. Please come back soon.');
    ({ owner } = await requireIdentity(req));
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'POST') {
      const character = url.searchParams.get('character');
      const before = url.searchParams.get('before');
      if (!chatCharacter(character) || (before && !/^[1-9][0-9]{0,17}$/.test(before)))
        throw chatError(400, 'Invalid conversation.');
      const result = await withOwner(owner, (client) =>
        req.method === 'DELETE'
          ? clearChat(client, owner, character)
          : readChat(client, owner, character, before),
      );
      return res.status(200).json({ ...result, available: Boolean(process.env.GROQ_API_KEY) });
    }
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw) > 6000) throw chatError(413, 'This message is too large.');
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw chatError(400, 'Invalid message.');
    }
    input = validateSend(body);
    if (!process.env.GROQ_API_KEY)
      throw chatError(503, 'Companion chat is not connected yet. Please come back soon.');
    reservation = await withOwner(owner, (client) => reserveChat(client, owner, input));
    if (reservation.complete)
      return res.status(200).json({
        ...(await withOwner(owner, (client) => readChat(client, owner, input.character))),
        available: true,
      });
    const answer = await generateChat(input, reservation);
    const result = await withOwner(owner, (client) =>
      finishChat(client, owner, input, reservation.token, answer),
    );
    return res.status(200).json({ ...result, available: true });
  } catch (error) {
    if (reservation?.token)
      await withOwner(owner, (client) => releaseChat(client, owner, reservation.token)).catch(
        () => {},
      );
    const status = error.status || 503;
    const quota =
      owner && input
        ? await withOwner(
            owner,
            async (client) => (await readChat(client, owner, input.character)).quota,
          ).catch(() => null)
        : null;
    return res.status(status).json({
      error: error.status
        ? error.message
        : 'Chat storage is temporarily unavailable. Please try again soon.',
      ...(quota ? { quota } : {}),
    });
  }
}
