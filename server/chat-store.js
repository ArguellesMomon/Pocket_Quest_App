import { randomUUID } from 'node:crypto';
import { CHAT_MESSAGE_LIMIT, chatCharacter } from '../shared/chat.js';

const PAGE_SIZE = 20;
export const chatError = (status, message) => Object.assign(new Error(message), { status });
export function chatLimit() {
  const value = Number(process.env.CHAT_DAILY_LIMIT || 20);
  return Number.isInteger(value) && value > 0 && value <= 100 ? value : 20;
}
function quota(row, now, limit) {
  const day = new Date(now).toISOString().slice(0, 10);
  const used = row && String(row.day).slice(0, 10) === day ? row.attempts : 0;
  return {
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: new Date(`${day}T00:00:00Z`).getTime() + 86400000,
  };
}
export function validateSend(body) {
  if (!body || !chatCharacter(body.character))
    throw chatError(400, 'Choose a companion to chat with.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id || ''))
    throw chatError(400, 'Invalid message ID.');
  if (
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.length > CHAT_MESSAGE_LIMIT
  )
    throw chatError(400, `Write a message of 1–${CHAT_MESSAGE_LIMIT} characters.`);
  return { character: body.character, id: body.id, message: body.message.trim() };
}
export async function readChat(
  client,
  owner,
  character,
  before,
  now = Date.now(),
  limit = chatLimit(),
) {
  const { rows } = await client.query(
    `select sequence::text as sequence, request_id as id, user_text as message, reply, created_at
     from pocketquest.chat_turns where owner_id=$1 and character_id=$2
     and ($3::bigint is null or sequence < $3::bigint) order by pocketquest.chat_turns.sequence desc limit $4`,
    [owner, character, before || null, PAGE_SIZE + 1],
  );
  const hasMore = rows.length > PAGE_SIZE;
  const turns = rows.slice(0, PAGE_SIZE).reverse();
  const usage = (
    await client.query(
      'select day::text as day,attempts from pocketquest.chat_usage where owner_id=$1',
      [owner],
    )
  ).rows[0];
  return { turns, before: hasMore ? turns[0].sequence : null, quota: quota(usage, now, limit) };
}

// Reserve in a short transaction, then call the provider outside the database transaction.
// One expiring lease per account orders messages across tabs and bounds abandoned requests.
export async function reserveChat(client, owner, input, now = Date.now(), limit = chatLimit()) {
  await client.query("set local lock_timeout = '3s'");
  const day = new Date(now).toISOString().slice(0, 10);
  await client.query(
    'insert into pocketquest.chat_usage(owner_id,day) values($1,$2) on conflict do nothing',
    [owner, day],
  );
  const usage = (
    await client.query(
      'select *,day::text as day from pocketquest.chat_usage where owner_id=$1 for update',
      [owner],
    )
  ).rows[0];
  const prior = (
    await client.query(
      'select character_id,user_text,reply from pocketquest.chat_turns where owner_id=$1 and request_id=$2',
      [owner, input.id],
    )
  ).rows[0];
  if (prior) {
    if (prior.character_id !== input.character || prior.user_text !== input.message)
      throw chatError(409, 'This message ID was already used.');
    return { complete: true };
  }
  if (Number(usage.pending_until) > now)
    throw chatError(409, 'Your companion is still replying. Try again in a moment.');
  if (quota(usage, now, limit).remaining === 0)
    throw chatError(
      429,
      'You have used today’s companion messages. Come back after the daily reset.',
    );
  if (now - Number(usage.last_attempt) < 6000)
    throw chatError(429, 'Take a breath—please wait a few seconds before sending another message.');
  await client.query(
    'insert into pocketquest.chat_conversations(owner_id,character_id) values($1,$2) on conflict do nothing',
    [owner, input.character],
  );
  const token = randomUUID();
  await client.query(
    `update pocketquest.chat_usage set attempts=case when day=$2::date then attempts+1 else 1 end,
     day=$2,last_attempt=$3,pending_token=$4,pending_character=$5,pending_until=$6 where owner_id=$1`,
    [owner, day, now, token, input.character, now + 90000],
  );
  const conversation = (
    await client.query(
      'select summary from pocketquest.chat_conversations where owner_id=$1 and character_id=$2',
      [owner, input.character],
    )
  ).rows[0];
  const turns = (
    await client.query(
      'select user_text as message,reply from pocketquest.chat_turns where owner_id=$1 and character_id=$2 order by sequence desc limit 6',
      [owner, input.character],
    )
  ).rows.reverse();
  const game = (
    await client.query('select state from pocketquest.games where owner_id=$1', [owner])
  ).rows[0];
  return { token, summary: conversation.summary, turns, state: game.state };
}
export async function finishChat(client, owner, input, token, result, now = Date.now()) {
  const usage = (
    await client.query(
      'select pending_token,pending_until from pocketquest.chat_usage where owner_id=$1 for update',
      [owner],
    )
  ).rows[0];
  if (usage?.pending_token !== token || Number(usage.pending_until) <= now)
    throw chatError(409, 'This conversation changed. Reopen the chat to see its latest messages.');
  await client.query(
    'insert into pocketquest.chat_turns(owner_id,character_id,request_id,user_text,reply) values($1,$2,$3,$4,$5)',
    [owner, input.character, input.id, input.message, result.reply],
  );
  await client.query(
    'update pocketquest.chat_conversations set summary=$3 where owner_id=$1 and character_id=$2',
    [owner, input.character, result.summary],
  );
  await releaseChat(client, owner, token);
  return readChat(client, owner, input.character, null, now);
}
export async function releaseChat(client, owner, token) {
  await client.query(
    'update pocketquest.chat_usage set pending_token=null,pending_character=null,pending_until=0 where owner_id=$1 and pending_token=$2',
    [owner, token],
  );
}
export async function clearChat(client, owner, character) {
  // Taking the account lock also prevents a late provider response from restoring cleared history.
  await client.query('select owner_id from pocketquest.chat_usage where owner_id=$1 for update', [
    owner,
  ]);
  await client.query(
    'update pocketquest.chat_usage set pending_token=null,pending_character=null,pending_until=0 where owner_id=$1 and pending_character=$2',
    [owner, character],
  );
  await client.query(
    'delete from pocketquest.chat_conversations where owner_id=$1 and character_id=$2',
    [owner, character],
  );
  return readChat(client, owner, character);
}
