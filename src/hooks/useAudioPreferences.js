import { useCallback, useEffect, useRef, useState } from 'react';

export const MUSIC_SOURCE = '/audio/pocket-quest-background.mp3';
const defaults = { haptics: true, music: false, volume: 12 };
function read(owner) {
  try {
    const saved = JSON.parse(localStorage.getItem(`pocketquest-audio:${owner}`));
    return {
      haptics:
        typeof saved?.haptics === 'boolean'
          ? saved.haptics
          : localStorage.getItem(`pocketquest-touch:${owner}`) !== 'off',
      music: saved?.music === true,
      volume: Number.isFinite(saved?.volume)
        ? Math.min(30, Math.max(0, saved.volume))
        : defaults.volume,
    };
  } catch {
    return { ...defaults };
  }
}
export function useAudioPreferences(owner = 'guest', enabled = false) {
  const [record, setRecord] = useState(() => ({ owner, values: read(owner) }));
  const values = record.owner === owner ? record.values : read(owner);
  const [status, setStatus] = useState('off');
  const snapshot = useRef(null),
    media = useRef(null),
    graph = useRef(null),
    epoch = useRef(0),
    pending = useRef(false);
  snapshot.current = { owner, enabled, values };
  const volume = useCallback((value) => {
    const gain = value / 100;
    if (graph.current)
      graph.current.gain.gain.setTargetAtTime(gain, graph.current.context.currentTime, 0.12);
    else if (media.current) media.current.volume = gain;
  }, []);
  const stop = useCallback(() => {
    epoch.current++;
    pending.current = false;
    media.current?.pause();
    graph.current?.context.suspend().catch(() => {});
    setStatus('off');
  }, []);
  const play = useCallback(() => {
    const current = snapshot.current;
    if (!current.enabled || !current.values.music || document.hidden || pending.current) return;
    if (
      media.current &&
      !media.current.paused &&
      (!graph.current || graph.current.context.state === 'running')
    )
      return;
    const request = ++epoch.current;
    pending.current = true;
    setStatus('loading');
    try {
      if (!media.current) {
        const audio = new Audio();
        audio.preload = 'none';
        audio.loop = true;
        audio.crossOrigin = 'anonymous';
        audio.src = MUSIC_SOURCE;
        audio.onerror = () => {
          if (!snapshot.current.enabled || !snapshot.current.values.music) return;
          epoch.current++;
          pending.current = false;
          audio.pause();
          graph.current?.context.suspend().catch(() => {});
          setStatus('error');
        };
        media.current = audio;
      }
      if (media.current.error) media.current.load();
      // A gain node also controls loudness on mobile browsers that ignore media.volume.
      if (!graph.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext?.prototype.createMediaElementSource) {
          const context = new AudioContext(),
            gain = context.createGain();
          gain.gain.value = current.values.volume / 100;
          const source = context.createMediaElementSource(media.current);
          source.connect(gain);
          gain.connect(context.destination);
          graph.current = { context, gain, source };
        }
      }
      volume(current.values.volume);
      const resume = graph.current ? graph.current.context.resume() : Promise.resolve();
      Promise.all([media.current.play(), resume])
        .then(() => {
          if (epoch.current === request) {
            pending.current = false;
            setStatus('playing');
          }
        })
        .catch((error) => {
          if (epoch.current === request) {
            pending.current = false;
            media.current?.pause();
            setStatus(error.name === 'NotAllowedError' ? 'waiting' : 'error');
          }
        });
    } catch {
      pending.current = false;
      media.current?.pause();
      setStatus('error');
    }
  }, [volume]);
  const update = useCallback(
    (patch) => {
      const current = snapshot.current;
      const next = { ...current.values, ...patch };
      if (patch.volume !== undefined)
        next.volume = Math.min(30, Math.max(0, Number(patch.volume) || 0));
      snapshot.current = { ...current, values: next };
      setRecord({ owner: current.owner, values: next });
      try {
        localStorage.setItem(`pocketquest-audio:${current.owner}`, JSON.stringify(next));
      } catch {}
      volume(next.volume);
      if (next.music) play();
      else stop();
    },
    [play, stop, volume],
  );
  useEffect(() => {
    setRecord({ owner, values: read(owner) });
    stop();
  }, [owner, stop]);
  useEffect(() => {
    if (enabled && values.music) play();
    else stop();
    const visible = () => (document.hidden ? stop() : play());
    const unlock = () => play();
    document.addEventListener('visibilitychange', visible);
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
  }, [owner, enabled, values.music, play, stop]);
  useEffect(() => volume(values.volume), [values.volume, volume]);
  useEffect(
    () => () => {
      epoch.current++;
      media.current?.pause();
      if (media.current) {
        media.current.onerror = null;
        media.current.removeAttribute('src');
        media.current.load();
      }
      graph.current?.context.close().catch(() => {});
      media.current = null;
      graph.current = null;
    },
    [],
  );
  return { ...values, status, update, play };
}
