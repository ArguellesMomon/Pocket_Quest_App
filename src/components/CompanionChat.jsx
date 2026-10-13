import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context';
import { companionFor } from '../../shared/companions.js';
import { CHAT_MESSAGE_LIMIT, PERSONALITIES } from '../../shared/chat.js';
import { accountRequest } from '../lib/cloud.js';
import Dialog from './Dialog';
import Icon from './Icon';
import SpritePet from './SpritePet';
import ChatCharacterPicker from './ChatCharacterPicker';

export default function CompanionChat({ onClose }) {
  const { state, user } = useGame();
  const [character, setCharacter] = useState(
    PERSONALITIES[state.pet.species] ? state.pet.species : 'cat',
  );
  const companion = companionFor(character);
  return (
    <Dialog
      title={`Talk to ${companion.name}`}
      onClose={onClose}
      headerContent={
        <div className="chat-identity">
          <ChatCharacterPicker value={character} onChange={setCharacter} />
          <span className="chat-ai-badge">AI</span>
        </div>
      }
    >
      <div className="companion-chat">
        {user ? (
          <ChatThread key={`${user.id}:${character}`} owner={user.id} character={character} />
        ) : (
          <div className="chat-empty">
            <SpritePet species={character} mood="curious" />
            <p>Sign in to chat with your companions.</p>
            <Link to="/login" className="button primary full-width" onClick={onClose}>
              Sign in to chat <Icon name="login" size={17} />
            </Link>
          </div>
        )}
      </div>
    </Dialog>
  );
}
function ChatThread({ owner, character }) {
  const [data, setData] = useState(null),
    [draft, setDraft] = useState(''),
    [error, setError] = useState('');
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [confirmClear, setConfirmClear] = useState(false),
    [refresh, setRefresh] = useState(0);
  const live = useRef(true),
    attempt = useRef(null),
    end = useRef(null),
    input = useRef(null),
    options = useRef(null);
  const companion = companionFor(character);
  const url = `/api/chat?character=${encodeURIComponent(character)}`;
  useEffect(() => {
    let active = true;
    live.current = true;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    accountRequest(url, { signal: controller.signal }, owner)
      .then((result) => {
        if (active) {
          setData(result);
          setError('');
        }
      })
      .catch((failure) => {
        if (active)
          setError(
            failure.name === 'AbortError'
              ? 'Chat took too long to load. Please reopen it to try again.'
              : failure.message,
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      live.current = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url, owner, refresh]);
  const latest = data?.turns.at(-1)?.id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [latest]);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = 'auto';
      input.current.style.height = `${Math.min(input.current.scrollHeight, 96)}px`;
    }
  }, [draft]);
  async function send(event) {
    event.preventDefault();
    if (busy || !draft.trim() || loading || !data?.available) return;
    if (!navigator.onLine) {
      setError('Chat needs an internet connection. Your message is still here.');
      return;
    }
    if (!attempt.current || attempt.current.message !== draft.trim())
      attempt.current = { id: crypto.randomUUID(), character, message: draft.trim() };
    setBusy(true);
    setError('');
    setConfirmClear(false);
    try {
      const result = await accountRequest(
        '/api/chat',
        { method: 'POST', body: attempt.current, timeout: 45000 },
        owner,
      );
      if (live.current) {
        setData(result);
        setDraft('');
        attempt.current = null;
      }
    } catch (failure) {
      if (live.current) {
        if (failure.quota) setData((current) => ({ ...current, quota: failure.quota }));
        setError(
          failure.name === 'TimeoutError'
            ? 'The reply took too long. Send again to check for your saved reply.'
            : failure.message || 'Could not connect. Your message is still here.',
        );
      }
    } finally {
      if (live.current) {
        setBusy(false);
        setTimeout(() => input.current?.focus(), 0);
      }
    }
  }
  async function clear() {
    setBusy(true);
    setError('');
    try {
      const result = await accountRequest(url, { method: 'DELETE' }, owner);
      if (live.current) {
        setData(result);
        setConfirmClear(false);
        attempt.current = null;
      }
    } catch (failure) {
      if (live.current) setError(failure.message);
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function older() {
    setBusy(true);
    setError('');
    try {
      const result = await accountRequest(`${url}&before=${data.before}`, {}, owner);
      if (live.current)
        setData((current) => ({ ...result, turns: [...result.turns, ...current.turns] }));
    } catch (failure) {
      if (live.current) setError(failure.message);
    } finally {
      if (live.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="chat-toolbar">
        <small>{data?.quota ? `${data.quota.remaining} left today` : 'Saved chat'}</small>
        <details className="chat-options" ref={options}>
          <summary role="button" aria-label="Chat options">
            <Icon name="more" size={20} />
          </summary>
          <div className="chat-options-menu">
            <p>
              AI replies can be mistaken. Chats are saved to your account. Groq receives this chat,
              memory, mood and quest counts.
            </p>
            {data?.quota && (
              <small>
                {data.quota.limit} messages daily · resets{' '}
                {new Date(data.quota.resetAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </small>
            )}
            <button
              type="button"
              disabled={busy || !data?.turns.length}
              aria-label={`Clear ${companion.name}'s conversation`}
              onClick={() => {
                options.current.open = false;
                setConfirmClear(true);
              }}
            >
              <Icon name="trash" size={16} /> Clear chat
            </button>
          </div>
        </details>
      </div>
      {confirmClear && (
        <div className="chat-clear-confirm">
          <p>Clear {companion.name}’s chat and memory?</p>
          <div>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmClear(false)}
            >
              Keep chat
            </button>
            <button type="button" className="button primary" disabled={busy} onClick={clear}>
              Clear conversation
            </button>
          </div>
        </div>
      )}
      <div
        className="chat-messages"
        aria-label={`${companion.name} conversation`}
        aria-busy={busy || loading}
      >
        {data?.before && (
          <button
            type="button"
            className="button secondary chat-older"
            disabled={busy}
            onClick={older}
          >
            Earlier messages
          </button>
        )}
        {loading ? (
          <p role="status" className="chat-status">
            Loading…
          </p>
        ) : (
          !data?.turns.length && (
            <div className="chat-greeting">
              <SpritePet species={character} mood="curious" />
              <p>{PERSONALITIES[character].greeting}</p>
            </div>
          )
        )}
        {data?.turns.map((turn) => (
          <div className="chat-turn" key={turn.id}>
            <div className="chat-bubble chat-user">
              <span className="sr-only">You: </span>
              <p>{turn.message}</p>
            </div>
            <div className="chat-bubble chat-companion">
              <span className="sr-only">{companion.name}: </span>
              <p>{turn.reply}</p>
            </div>
          </div>
        ))}
        {busy && (
          <p className="chat-status" role="status">
            <span className="sr-only">Waiting for your companion</span>…
          </p>
        )}
        <div ref={end} />
      </div>
      {!loading && (error || !data?.available || data?.quota.remaining === 0) && (
        <div className="chat-feedback">
          <p className={error ? 'chat-error' : 'chat-status'} role={error ? 'alert' : 'status'}>
            {error ||
              (!data?.available ? 'Chat is unavailable right now.' : 'Daily limit reached.')}
          </p>
          {!busy && (!data || !data.available || data.quota.remaining === 0) && (
            <button
              type="button"
              className="icon-button"
              aria-label="Refresh chat"
              onClick={() => setRefresh((value) => value + 1)}
            >
              <Icon name="reset" size={17} />
            </button>
          )}
        </div>
      )}
      <form className="chat-compose" onSubmit={send}>
        <label htmlFor={`chat-draft-${character}`} className="sr-only">
          Message {companion.name}
        </label>
        <textarea
          ref={input}
          id={`chat-draft-${character}`}
          rows={1}
          placeholder={`Message ${companion.name}…`}
          value={draft}
          maxLength={CHAT_MESSAGE_LIMIT}
          disabled={busy || loading || !data?.available}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !matchMedia('(pointer: coarse)').matches
            ) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
        />
        {draft.length > 800 && (
          <small className="chat-character-count">
            {draft.length}/{CHAT_MESSAGE_LIMIT}
          </small>
        )}
        <button
          type="submit"
          className="chat-send"
          aria-label="Send"
          disabled={
            busy || loading || !data?.available || !draft.trim() || data?.quota.remaining === 0
          }
        >
          <Icon name="arrow" size={20} />
        </button>
      </form>
    </>
  );
}
