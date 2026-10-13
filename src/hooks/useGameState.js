import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, createGame, dayKey, upgradeGame } from '../../shared/game.js';
import { auth, cloudConfigured, cloudRequest } from '../lib/cloud.js';
import { retryableSyncError, retryDelay } from '../lib/sync-policy.js';
const KEY = 'pocketquest-guest-v1';
function readGuest() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return value?.schema === 1 &&
      Array.isArray(value.tasks) &&
      Array.isArray(value.completions) &&
      Array.isArray(value.activity) &&
      Array.isArray(value.bonusDays) &&
      value.equipped &&
      Array.isArray(value.equipped.decor) &&
      value.inventory &&
      Number.isFinite(value.coins) &&
      Number.isFinite(value.xp) &&
      typeof value.name === 'string' &&
      typeof value.timezone === 'string' &&
      value.pet &&
      value.settings
      ? upgradeGame(value)
      : null;
  } catch {
    return null;
  }
}
export function useGameState() {
  const [state, setState] = useState(readGuest);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(Date.now());
  const stateRef = useRef(state),
    userRef = useRef(user),
    lock = useRef(false),
    version = useRef(0),
    mode = useRef('guest');
  const pending = useRef(null);
  const retryAttempts = useRef(0);
  const [pendingAction, setPendingAction] = useState(false);
  const timer = useRef(null);
  const toast = useCallback((message, kind = 'success') => {
    clearTimeout(timer.current);
    setNotice({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setNotice(null), 5000);
  }, []);
  const accept = useCallback((value) => {
    const upgraded = upgradeGame(value);
    stateRef.current = upgraded;
    setState(upgraded);
  }, []);
  const restore = useCallback(async () => {
    setError('');
    if (!auth || !navigator.onLine) {
      setReady(true);
      return;
    }
    setReady(false);
    try {
      const response = await fetch('/api/auth/get-session', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Could not restore your account. Please try again.');
      const session = await response.json();
      const identity = session?.user || null;
      userRef.current = identity;
      setUser(identity);
      if (identity) {
        mode.current = 'cloud';
        accept(null);
        const result = await cloudRequest();
        version.current = result.version;
        accept(result.state);
        try {
          pending.current =
            JSON.parse(sessionStorage.getItem(`pocketquest-pending:${identity.id}`)) || null;
        } catch {
          pending.current = null;
        }
        setPendingAction(Boolean(pending.current));
      } else {
        mode.current = 'guest';
        pending.current = null;
        setPendingAction(false);
        accept(readGuest());
      }
    } catch (e) {
      setError(e.message || 'Could not restore your session.');
    } finally {
      setReady(true);
    }
  }, [accept]);
  useEffect(() => {
    restore();
    return () => clearTimeout(timer.current);
  }, [restore]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const listener = (event) => {
      if (event.key === KEY && mode.current === 'guest') accept(readGuest());
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [accept]);
  const startGuest = useCallback(
    (species) => {
      if (userRef.current) return;
      const next = readGuest() || createGame(species);
      localStorage.setItem(KEY, JSON.stringify(next));
      mode.current = 'guest';
      accept(next);
      setError('');
    },
    [accept],
  );
  const act = useCallback(
    async (input, retry = false) => {
      if (lock.current || !stateRef.current || (retry && !pending.current)) return false;
      if (pending.current && !retry) {
        return false;
      }
      lock.current = true;
      setBusy(true);
      const action = retry ? pending.current : { ...input, id: crypto.randomUUID() };
      try {
        let result;
        if (userRef.current) {
          pending.current = action;
          setPendingAction(true);
          sessionStorage.setItem(
            `pocketquest-pending:${userRef.current.id}`,
            JSON.stringify(action),
          );
          result = await cloudRequest(action);
          if (result.version < version.current)
            throw new Error('Please reload to sync the latest adventure.');
          version.current = result.version;
        } else {
          // Web Locks keep two open guest tabs from spending the same balance.
          const apply = () => {
            const r = applyAction(readGuest() || stateRef.current, action);
            localStorage.setItem(KEY, JSON.stringify(r.state));
            return r;
          };
          result = navigator.locks ? await navigator.locks.request(KEY, apply) : apply();
        }
        pending.current = null;
        retryAttempts.current = 0;
        setPendingAction(false);
        accept(result.state);
        setError('');
        toast(result.message);
        if (userRef.current) sessionStorage.removeItem(`pocketquest-pending:${userRef.current.id}`);
        if (action.type === 'task.complete' && result.state.settings.sound) {
          try {
            const Audio = window.AudioContext || window.webkitAudioContext;
            const audio = new Audio();
            const oscillator = audio.createOscillator(),
              gain = audio.createGain();
            oscillator.connect(gain);
            gain.connect(audio.destination);
            gain.gain.setValueAtTime(0.08, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
            oscillator.frequency.setValueAtTime(660, audio.currentTime);
            oscillator.frequency.setValueAtTime(880, audio.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audio.currentTime + 0.25);
            oscillator.onended = () => audio.close();
          } catch {}
        }
        return true;
      } catch (e) {
        // Validation errors are definite failures. Unknown transport outcomes retain the same operation ID for a safe retry.
        const willRetry = Boolean(userRef.current) && retryableSyncError(e);
        if (!willRetry) {
          pending.current = null;
          setPendingAction(false);
          if (userRef.current)
            sessionStorage.removeItem(`pocketquest-pending:${userRef.current.id}`);
        }
        if (willRetry) {
          if (retry) retryAttempts.current++;
        } else toast(e.message, 'error');
        if (e.status === 401) await restore();
        return false;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [accept, toast, restore],
  );
  useEffect(() => {
    if (!pendingAction || busy || !user || !ready) return;
    const resume = () => {
      if (navigator.onLine && !document.hidden && pending.current && !lock.current) act(null, true);
    };
    const timeout =
      navigator.onLine && !document.hidden
        ? setTimeout(resume, retryDelay(retryAttempts.current))
        : null;
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [pendingAction, busy, user, ready, act]);
  const signOut = useCallback(async () => {
    if (auth && userRef.current) {
      const result = await auth.signOut();
      if (result.error) throw new Error(result.error.message);
    }
    userRef.current = null;
    setUser(null);
    mode.current = 'guest';
    pending.current = null;
    setPendingAction(false);
    accept(readGuest());
  }, [accept]);
  return {
    state,
    user,
    ready,
    busy,
    error,
    now,
    toast,
    notice,
    dismissNotice: () => setNotice(null),
    act,
    startGuest,
    restore,
    signOut,
    pendingAction,
    retry: () => act(null, true),
    today: state ? dayKey(now, state.timezone) : '',
  };
}
