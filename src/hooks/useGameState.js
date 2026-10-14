import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, createGame, dayKey, upgradeGame } from '../../shared/game.js';
import { createSnapshot, enqueue, projectedState, reconcile } from '../../shared/outbox.js';
import {
  auth,
  clearTokenCache,
  cloudConfigured,
  cloudRequest,
  accountRequest,
} from '../lib/cloud.js';
import { retryableSyncError, retryDelay } from '../lib/sync-policy.js';
const KEY = 'pocketquest-guest-v1',
  ACCOUNT = 'pocketquest-account-v2';
const cloudKey = (owner) => `pocketquest-cloud-v2:${owner}`;
function readJSON(storage, key) {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
}
function readGuest() {
  const value = readJSON(localStorage, KEY);
  return value?.schema === 1 &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.completions) &&
    Array.isArray(value.activity) &&
    Array.isArray(value.bonusDays) &&
    Array.isArray(value.equipped?.decor) &&
    value.inventory &&
    Number.isFinite(value.coins) &&
    Number.isFinite(value.xp) &&
    value.pet &&
    value.settings
    ? upgradeGame(value)
    : null;
}
function readCloud(owner) {
  const value = readJSON(localStorage, cloudKey(owner));
  return value?.schema === 1 &&
    value.base?.pet &&
    value.base?.settings &&
    Number.isFinite(value.version) &&
    Array.isArray(value.queue)
    ? value
    : null;
}
function withLock(key, run) {
  return navigator.locks ? navigator.locks.request(key, run) : Promise.resolve().then(run);
}
function boot() {
  const user = readJSON(sessionStorage, ACCOUNT);
  const snapshot = user?.id ? readCloud(user.id) : null;
  return snapshot
    ? { user, state: projectedState(snapshot), snapshot }
    : { user: null, state: readGuest(), snapshot: null };
}
function victorySound() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
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
export function useGameState() {
  const initial = useRef(null);
  if (!initial.current) initial.current = boot();
  const [state, setState] = useState(initial.current.state),
    [user, setUser] = useState(initial.current.user);
  const [admin, setAdmin] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const adminLock = useRef(false);
  const [ready, setReady] = useState(Boolean(initial.current.snapshot) || !cloudConfigured);
  const [busy, setBusy] = useState(false),
    [syncing, setSyncing] = useState(false);
  const [pendingAction, setPendingAction] = useState(
    Boolean(initial.current.snapshot?.queue.length || initial.current.snapshot?.refresh),
  );
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(null),
    [now, setNow] = useState(Date.now());
  const stateRef = useRef(state),
    userRef = useRef(user),
    snapshotRef = useRef(initial.current.snapshot);
  const mode = useRef(user ? 'cloud' : 'guest'),
    flight = useRef(false),
    guestLock = useRef(false),
    timer = useRef(null),
    restoreRef = useRef(null);
  const restoreEpoch = useRef(0);
  const verifiedOwner = useRef(null);
  const toast = useCallback((message, kind = 'success') => {
    clearTimeout(timer.current);
    setNotice({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setNotice(null), 5000);
  }, []);
  const accept = useCallback((value) => {
    const next = upgradeGame(value);
    stateRef.current = next;
    setState(next);
  }, []);
  const publish = useCallback(
    (owner, snapshot) => {
      if (userRef.current?.id !== owner) return;
      snapshotRef.current = snapshot;
      accept(projectedState(snapshot));
      setPendingAction(Boolean(snapshot.queue.length || snapshot.refresh));
      setRevision((value) => value + 1);
    },
    [accept],
  );
  const storeSnapshot = useCallback(
    (owner, snapshot) => {
      localStorage.setItem(cloudKey(owner), JSON.stringify(snapshot));
      publish(owner, snapshot);
    },
    [publish],
  );
  const restore = useCallback(async () => {
    const epoch = ++restoreEpoch.current;
    verifiedOwner.current = null;
    setAdmin(false);
    setError('');
    if (!auth || !navigator.onLine) {
      setReady(true);
      return;
    }
    if (!stateRef.current) setReady(false);
    try {
      const response = await fetch('/api/auth/get-session', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Could not restore your account. Please try again.');
      const session = await response.json(),
        identity = session?.user || null;
      if (epoch !== restoreEpoch.current) return;
      if (userRef.current?.id !== identity?.id) clearTokenCache();
      userRef.current = identity;
      verifiedOwner.current = identity?.id || null;
      setUser(identity);
      if (!identity) {
        mode.current = 'guest';
        snapshotRef.current = null;
        sessionStorage.removeItem(ACCOUNT);
        setPendingAction(false);
        accept(readGuest());
        return;
      }
      const owner = identity.id;
      mode.current = 'cloud';
      sessionStorage.setItem(
        ACCOUNT,
        JSON.stringify({ id: owner, name: identity.name, email: identity.email }),
      );
      const cached = readCloud(owner);
      if (cached) {
        publish(owner, cached);
        setReady(true);
      } else {
        accept(null);
        setReady(false);
      }
      // Migrate old interrupted requests by confirming their existing ID before
      // adopting a fresh server snapshot. Never replay them against an uncertain GET.
      const legacy = readJSON(sessionStorage, `pocketquest-pending:${owner}`);
      if (legacy) {
        const result = await cloudRequest(legacy, false, owner);
        await withLock(cloudKey(owner), () => {
          const current = readCloud(owner);
          if (!current) storeSnapshot(owner, createSnapshot(result));
          else if (!current.queue.length) storeSnapshot(owner, reconcile(current, result).snapshot);
        });
        sessionStorage.removeItem(`pocketquest-pending:${owner}`);
        const access = await cloudRequest(undefined, false, owner);
        if (epoch === restoreEpoch.current) setAdmin(access.admin === true);
      } else if (!cached?.queue.length && !cached?.refresh) {
        const result = await cloudRequest(undefined, false, owner);
        if (epoch === restoreEpoch.current) setAdmin(result.admin === true);
        await withLock(cloudKey(owner), () => {
          const current = readCloud(owner);
          // A command may have started during GET. Its persisted pre-action base
          // must remain intact until its POST acknowledgment arrives.
          if (!current) storeSnapshot(owner, createSnapshot(result));
          else if (!current.queue.length && !current.refresh)
            storeSnapshot(owner, reconcile(current, result).snapshot);
        });
      } else {
        const access = await cloudRequest(undefined, false, owner);
        if (epoch === restoreEpoch.current) setAdmin(access.admin === true);
      }
    } catch (e) {
      if (epoch === restoreEpoch.current) {
        setError(e.message || 'Could not restore your session.');
        const owner = userRef.current?.id;
        if (owner)
          await withLock(cloudKey(owner), () => {
            const snapshot = readCloud(owner);
            if (snapshot && (snapshot.queue.length || snapshot.refresh)) {
              snapshot.attempts = (snapshot.attempts || 0) + 1;
              storeSnapshot(owner, snapshot);
            }
          });
      }
    } finally {
      if (epoch === restoreEpoch.current) setReady(true);
    }
  }, [accept, publish, storeSnapshot]);
  restoreRef.current = restore;
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
      if (mode.current === 'guest' && event.key === KEY) accept(readGuest());
      else if (userRef.current && event.key === cloudKey(userRef.current.id)) {
        const snapshot = readCloud(userRef.current.id);
        if (snapshot) publish(userRef.current.id, snapshot);
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [accept, publish]);
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
  const drain = useCallback(async () => {
    const owner = userRef.current?.id;
    if (!owner || verifiedOwner.current !== owner || flight.current || !navigator.onLine)
      return false;
    flight.current = true;
    setSyncing(true);
    try {
      // The network lock is distinct from the short storage lock: more local
      // interactions can be queued while one tab submits the account's commands.
      await withLock(`${cloudKey(owner)}:network`, async () => {
        while (userRef.current?.id === owner && navigator.onLine) {
          let command, needsRefresh;
          await withLock(cloudKey(owner), () => {
            const snapshot = readCloud(owner);
            if (!snapshot) return;
            needsRefresh = snapshot.refresh;
            command = snapshot.queue[0]?.action;
            if (command && !needsRefresh) {
              snapshot.queue[0].sent = true;
              storeSnapshot(owner, snapshot);
            }
          });
          if (!command && !needsRefresh) break;
          try {
            const result = await cloudRequest(needsRefresh ? undefined : command, false, owner);
            await withLock(cloudKey(owner), () => {
              const snapshot = readCloud(owner);
              if (!snapshot) return;
              const rebased = reconcile(snapshot, result, needsRefresh ? undefined : command.id);
              storeSnapshot(owner, rebased.snapshot);
              for (const message of rebased.rejected) toast(message, 'error');
            });
            setError('');
          } catch (e) {
            const retryable = retryableSyncError(e);
            await withLock(cloudKey(owner), () => {
              const snapshot = readCloud(owner);
              if (!snapshot) return;
              if (!retryable && snapshot.queue[0]?.action.id === command?.id) {
                snapshot.queue.shift();
                snapshot.refresh = true;
              }
              snapshot.attempts = (snapshot.attempts || 0) + 1;
              storeSnapshot(owner, snapshot);
            });
            if (!retryable) toast(e.message, 'error');
            if (e.status === 401) await restoreRef.current();
            break;
          }
        }
      });
      const latest = readCloud(owner);
      if (latest) publish(owner, latest);
      return true;
    } finally {
      flight.current = false;
      setSyncing(false);
    }
  }, [storeSnapshot, publish, toast]);
  const act = useCallback(
    async (input, { quiet = false, sound = true } = {}) => {
      if (!input || !stateRef.current) return false;
      if (adminLock.current) {
        toast('Let the test changes finish saving first.', 'error');
        return false;
      }
      const action = { ...input, id: crypto.randomUUID() };
      try {
        let message, next;
        if (userRef.current) {
          const owner = userRef.current.id;
          await withLock(cloudKey(owner), () => {
            const snapshot = readCloud(owner);
            if (!snapshot) throw new Error('Reconnect to load your adventure first.');
            const queued = enqueue(snapshot, action);
            storeSnapshot(owner, queued.snapshot);
            next = stateRef.current;
            message = queued.message;
          });
        } else {
          if (guestLock.current) return false;
          guestLock.current = true;
          setBusy(true);
          try {
            await withLock(KEY, () => {
              const result = applyAction(readGuest() || stateRef.current, action);
              localStorage.setItem(KEY, JSON.stringify(result.state));
              accept(result.state);
              next = result.state;
              message = result.message;
            });
          } finally {
            guestLock.current = false;
            setBusy(false);
          }
        }
        if (!quiet && !['settings.update', 'pet.switch', 'background.reset'].includes(action.type))
          toast(message);
        if (sound && action.type === 'task.complete' && next.settings.sound) victorySound();
        return true;
      } catch (e) {
        toast(e.message, 'error');
        return false;
      }
    },
    [accept, storeSnapshot, toast],
  );
  useEffect(() => {
    if (!pendingAction || syncing || !user || !ready) return;
    const resume = () => {
      if (navigator.onLine && !document.hidden) {
        if (verifiedOwner.current === user.id) drain();
        else restoreRef.current();
      }
    };
    const attempts = snapshotRef.current?.attempts || 0;
    const timeout =
      navigator.onLine && !document.hidden && (verifiedOwner.current === user.id || error)
        ? setTimeout(resume, attempts ? retryDelay(attempts - 1) : 0)
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
  }, [pendingAction, syncing, user, ready, revision, error, drain]);
  const signOut = useCallback(async () => {
    if (adminLock.current) throw new Error('Let the test changes finish saving first.');
    const owner = userRef.current?.id;
    if (owner) {
      const snapshot = readCloud(owner);
      if (snapshot?.queue.length || snapshot?.refresh)
        throw new Error('Let your latest changes finish saving before signing out.');
      restoreEpoch.current++;
      const result = await auth.signOut();
      if (result.error) throw new Error(result.error.message);
    }
    clearTokenCache();
    verifiedOwner.current = null;
    sessionStorage.removeItem(ACCOUNT);
    userRef.current = null;
    setUser(null);
    setAdmin(false);
    mode.current = 'guest';
    snapshotRef.current = null;
    setPendingAction(false);
    accept(readGuest());
  }, [accept]);
  const updateTestProgress = useCallback(
    async (request) => {
      const owner = userRef.current?.id;
      if (!owner || adminLock.current)
        throw Object.assign(new Error('Test controls are not available right now.'), {
          status: 409,
        });
      adminLock.current = true;
      setAdminSaving(true);
      try {
        return await withLock(`${cloudKey(owner)}:network`, async () => {
          await withLock(cloudKey(owner), () => {
            const snapshot = readCloud(owner);
            if (!snapshot || snapshot.queue.length || snapshot.refresh)
              throw Object.assign(
                new Error('Let your latest changes finish saving before editing test values.'),
                { status: 409 },
              );
          });
          const result = await accountRequest(
            '/api/admin',
            { method: 'POST', body: request },
            owner,
          );
          await withLock(cloudKey(owner), () => {
            if (userRef.current?.id !== owner) return;
            const snapshot = readCloud(owner);
            if (snapshot) storeSnapshot(owner, reconcile(snapshot, result).snapshot);
          });
          return result;
        });
      } finally {
        adminLock.current = false;
        setAdminSaving(false);
      }
    },
    [storeSnapshot],
  );
  return {
    state,
    user,
    admin,
    ready,
    busy: busy || adminSaving,
    syncing,
    error,
    now,
    toast,
    notice,
    dismissNotice: () => setNotice(null),
    act,
    startGuest,
    restore,
    signOut,
    updateTestProgress,
    pendingAction,
    retry: () => (verifiedOwner.current === userRef.current?.id ? drain() : restore()),
    today: state ? dayKey(now, state.timezone) : '',
  };
}
