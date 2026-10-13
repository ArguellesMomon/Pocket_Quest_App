import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context';
import { completed } from '../../shared/game';
import Icon from './Icon';
export default function FocusCard({ initialTaskId = '' }) {
  const { state, user, now, act, toast, busy } = useGame();
  const key = `pocketquest-focus:${user?.id || 'guest'}`;
  const [focus, setFocus] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(key)) || {
          minutes: 25,
          remaining: 1500,
          end: null,
          taskId: initialTaskId,
          started: false,
        }
      );
    } catch {
      return { minutes: 25, remaining: 1500, end: null, taskId: initialTaskId, started: false };
    }
  });
  const notified = useRef(false);
  useEffect(() => {
    if (initialTaskId)
      setFocus((current) => (current.started ? current : { ...current, taskId: initialTaskId }));
  }, [initialTaskId]);
  const seconds = focus.end ? Math.max(0, Math.ceil((focus.end - now) / 1000)) : focus.remaining;
  const done = focus.started && seconds === 0;
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(focus));
  }, [key, focus]);
  useEffect(() => {
    if (done && !notified.current) {
      toast(
        'Your focus time is complete. Take a breath, then mark your quest done when it’s ready.',
      );
      notified.current = true;
    }
  }, [done, toast]);
  const eligible = state.tasks.filter((t) => !completed(state, t, now));
  const selected = state.tasks.find((t) => t.id === focus.taskId);
  const reset = () => {
    notified.current = false;
    setFocus((f) => ({ ...f, end: null, remaining: f.minutes * 60, started: false }));
  };
  return (
    <section className="focus-card panel">
      <div className="section-title">
        <h2>
          <Icon name="clock" size={19} />A moment of focus
        </h2>
        <span className="live-dot" />
      </div>
      <p>One thing at a time. You’ve got this.</p>
      <div className="focus-duration" aria-label="Focus duration">
        {[15, 25, 45].map((minutes) => (
          <button
            key={minutes}
            disabled={Boolean(focus.end)}
            aria-pressed={focus.minutes === minutes}
            className={focus.minutes === minutes ? 'active' : ''}
            onClick={() => {
              notified.current = false;
              setFocus((f) => ({ ...f, minutes, remaining: minutes * 60, started: false }));
            }}
          >
            {minutes} min
          </button>
        ))}
      </div>
      <div
        className="timer-display"
        aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}
      >
        {String(Math.floor(seconds / 60)).padStart(2, '0')}
        <span>:</span>
        {String(seconds % 60).padStart(2, '0')}
      </div>
      <label className="sr-only" htmlFor="focus-quest">
        Quest to focus on
      </label>
      <select
        id="focus-quest"
        value={focus.taskId}
        disabled={Boolean(focus.end)}
        onChange={(e) => setFocus((f) => ({ ...f, taskId: e.target.value }))}
      >
        <option value="">Choose a quest (optional)</option>
        {eligible.map((t) => (
          <option value={t.id} key={t.id}>
            {t.title}
          </option>
        ))}
        {selected && !eligible.some((t) => t.id === selected.id) && (
          <option value={selected.id}>{selected.title} · completed</option>
        )}
      </select>
      <div className="focus-controls">
        <button className="button secondary" onClick={reset} aria-label="Reset focus timer">
          <Icon name="reset" size={17} />
        </button>
        {done ? (
          <button
            className="button primary"
            disabled={busy || !selected || completed(state, selected, now)}
            onClick={async () => {
              if (await act({ type: 'task.complete', taskId: selected.id })) reset();
            }}
          >
            <Icon name="check" size={17} />
            Mark quest done
          </button>
        ) : (
          <button
            className="button primary"
            onClick={() =>
              setFocus((f) =>
                f.end
                  ? { ...f, end: null, remaining: seconds }
                  : { ...f, end: Date.now() + seconds * 1000, started: true },
              )
            }
          >
            <Icon name={focus.end ? 'pause' : 'play'} size={16} />
            {focus.end ? 'Pause' : focus.started ? 'Resume focus' : 'Start focusing'}
          </button>
        )}
      </div>
      {done && !selected && (
        <p className="focus-done">
          Time well spent. Pick a quest to mark it done, or reset for another session.
        </p>
      )}
    </section>
  );
}
