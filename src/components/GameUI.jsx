import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context';
import { CATEGORIES, DIFFICULTIES, completed, dayKey, levelFor, petStats } from '../../shared/game';
import Icon from './Icon';
import Dialog from './Dialog';
import { PixelPet } from './PixelArt';
export const categoryIcons = {
  Work: 'flag',
  Learning: 'book',
  Wellbeing: 'leaf',
  Home: 'home',
  Creative: 'sparkles',
};
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Progress({ value, max = 100, label, color = 'accent' }) {
  const amount = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`progress ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <span style={{ width: `${amount}%` }} />
    </div>
  );
}
export function EmptyState({ icon = 'sprout', title, description, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function QuestRow({ task }) {
  const { state, now, act, busy, editQuest } = useGame();
  const done = completed(state, task, now),
    reward = DIFFICULTIES[task.difficulty];
  const today = dayKey(now, state.timezone);
  const dueLabel =
    task.due === today
      ? 'Today'
      : task.due < today
        ? 'Overdue'
        : task.due
          ? new Intl.DateTimeFormat('en', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(`${task.due}T12:00:00Z`))
          : '';
  const [confirm, setConfirm] = useState(false);
  const [view, setView] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <>
      <div className={`quest-row ${done ? 'is-done' : ''}`}>
        <button
          className="quest-check"
          aria-label={`Complete ${task.title}`}
          disabled={done || busy}
          onClick={() => act({ type: 'task.complete', taskId: task.id })}
        >
          {done && <Icon name="check" size={16} />}
        </button>
        <span className={`category-symbol ${task.category.toLowerCase()}`}>
          <Icon name={categoryIcons[task.category]} size={19} />
        </span>
        <div className="quest-copy">
          <button
            className="quest-title"
            onClick={() => setView(true)}
            aria-label={`View quest ${task.title}`}
          >
            {task.title}
          </button>
          <div className="quest-meta">
            <span>{task.category}</span>
            <span className="meta-separator">·</span>
            <span>{task.recurrence === 'daily' ? 'Daily' : reward.label}</span>
            {task.due && (
              <span
                className={`due-chip ${task.due < today ? 'overdue' : task.due === today ? 'today' : ''}`}
              >
                <Icon name="clock" size={10} />
                {dueLabel}
              </span>
            )}
          </div>
        </div>
        <span className="quest-reward">
          <Icon name={done ? 'check' : 'coins'} size={16} />
          {done ? 'Done' : `+${reward.coins}`}
        </span>
        <button
          className="icon-button quest-options"
          aria-label={`Options for ${task.title}`}
          onClick={() => setMenu(true)}
        >
          <Icon name="more" size={19} />
        </button>
      </div>
      {menu && (
        <Dialog title="Quest options" onClose={() => setMenu(false)}>
          <div className="dialog-body quest-option-actions">
            {!(task.recurrence === 'once' && done) && (
              <button
                className="button secondary full-width"
                onClick={() => {
                  setMenu(false);
                  editQuest(task);
                }}
              >
                <Icon name="edit" size={17} />
                Edit
              </button>
            )}
            <button
              className="button danger full-width"
              onClick={() => {
                setMenu(false);
                setConfirm(true);
              }}
            >
              <Icon name="trash" size={17} />
              Remove
            </button>
          </div>
        </Dialog>
      )}
      {view && (
        <Dialog
          title={task.title}
          subtitle={`${task.category} · ${task.recurrence === 'daily' ? 'Daily ritual' : 'One-time quest'}`}
          onClose={() => setView(false)}
        >
          <div className="dialog-body quest-detail">
            <p>{task.notes || 'One small step at a time. You’ve got this.'}</p>
            <div className="quest-detail-reward">
              <span>
                <Icon name="coins" size={18} />
                {reward.coins} coins
              </span>
              <span>
                <Icon name="star" size={18} />
                {reward.xp} XP
              </span>
            </div>
            {task.due && <p className="field-hint">Due {task.due}</p>}
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setView(false)}>
                Close
              </button>
              <button
                className="button primary"
                disabled={done || busy}
                onClick={async () => {
                  if (await act({ type: 'task.complete', taskId: task.id })) setView(false);
                }}
              >
                <Icon name="check" size={17} />
                {done ? 'Quest completed' : 'Mark quest done'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title="Let this quest go?"
          subtitle="Your earned rewards and journey history will stay with you."
          onClose={() => setConfirm(false)}
        >
          <div className="dialog-body">
            <p className="confirm-quest">{task.title}</p>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setConfirm(false)}>
                Keep quest
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  if (await act({ type: 'task.delete', taskId: task.id })) setConfirm(false);
                }}
              >
                Remove quest
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
export function QuestEditor({ task, onClose }) {
  const { act, busy } = useGame();
  const [data, setData] = useState(
    task || {
      title: '',
      notes: '',
      category: 'Work',
      difficulty: 'gentle',
      recurrence: 'once',
      due: '',
    },
  );
  const update = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const [advanced, setAdvanced] = useState(Boolean(task?.notes || task?.due));
  return (
    <Dialog title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form
        className="dialog-body quest-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act({
              type: task ? 'task.edit' : 'task.create',
              taskId: task?.id || crypto.randomUUID(),
              data,
            })
          )
            onClose();
        }}
      >
        <label>
          Task
          <input
            autoFocus
            required
            maxLength={100}
            value={data.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="One thing you’d like to do"
          />
        </label>
        <button
          type="button"
          className={`task-repeat-toggle ${data.recurrence === 'daily' ? 'is-on' : ''}`}
          role="switch"
          aria-label="Repeat daily"
          aria-checked={data.recurrence === 'daily'}
          onClick={() => update('recurrence', data.recurrence === 'daily' ? 'once' : 'daily')}
        >
          <Icon name="sun" size={16} />
          <span>Repeat daily</span>
          <Icon name={data.recurrence === 'daily' ? 'check' : 'plus'} size={16} />
        </button>
        {advanced && (
          <label>
            Notes <span className="optional">optional</span>
            <textarea
              maxLength={1000}
              rows={3}
              value={data.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Break it down or leave yourself a kind reminder…"
            />
          </label>
        )}
        {advanced && (
          <div className="form-grid">
            <label>
              Category
              <select value={data.category} onChange={(e) => update('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Repeat
              <select
                value={data.recurrence}
                onChange={(e) => update('recurrence', e.target.value)}
              >
                <option value="once">Just this once</option>
                <option value="daily">Every day</option>
              </select>
            </label>
          </div>
        )}
        <fieldset className="effort-field">
          <legend>Effort</legend>
          <div className="effort-options">
            {Object.entries(DIFFICULTIES).map(([id, d]) => (
              <button
                className={data.difficulty === id ? 'selected' : ''}
                type="button"
                key={id}
                aria-pressed={data.difficulty === id}
                onClick={() => update('difficulty', id)}
              >
                <Icon
                  name={id === 'gentle' ? 'sprout' : id === 'steady' ? 'leaf' : 'flag'}
                  size={18}
                />
                <strong>{d.label}</strong>
                <span>{d.coins} coins</span>
              </button>
            ))}
          </div>
        </fieldset>
        {advanced && (
          <label>
            Due date <span className="optional">optional</span>
            <input
              type="date"
              value={data.due || ''}
              onChange={(e) => update('due', e.target.value)}
            />
          </label>
        )}
        <button
          type="button"
          className="text-link"
          onClick={() => setAdvanced(!advanced)}
          aria-expanded={advanced}
        >
          <Icon name="filter" size={15} />
          {advanced ? 'Fewer details' : 'Details'}
        </button>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy || !data.title.trim()}>
            {busy ? 'Saving…' : task ? 'Save' : 'Add task'}
            <Icon name="plus" size={17} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function CompanionStats({ large = false }) {
  const { state, now } = useGame();
  const stats = petStats(state, now);
  return (
    <div className={`companion-stats ${large ? 'large' : ''}`}>
      <div>
        <div className="stat-label">
          <span>
            <Icon name="heart" size={15} />
            Joy
          </span>
          <strong>
            {stats.joy}
            <small>/100</small>
          </strong>
        </div>
        <Progress value={stats.joy} label="Companion joy" color="pink" />
      </div>
      <div>
        <div className="stat-label">
          <span>
            <Icon name="zap" size={15} />
            Energy
          </span>
          <strong>
            {stats.energy}
            <small>/100</small>
          </strong>
        </div>
        <Progress value={stats.energy} label="Companion energy" color="gold" />
      </div>
    </div>
  );
}
export function LevelProgress() {
  const { state } = useGame();
  const level = levelFor(state.xp);
  return (
    <div className="level-progress">
      <div className="stat-label">
        <span>
          <Icon name="star" size={15} />
          Level {level}
          <span className="level-stage">
            {level < 3 ? 'Little explorer' : level < 6 ? 'Brave adventurer' : 'Meadow guardian'}
          </span>
        </span>
        <small>{state.xp % 150} / 150 XP</small>
      </div>
      <Progress value={state.xp % 150} max={150} label="Progress to next level" />
    </div>
  );
}
export function HelpDialog({ onClose }) {
  return (
    <Dialog title="Little steps, real progress" onClose={onClose}>
      <div className="dialog-body quick-guide">
        {[
          {
            icon: 'tasks',
            title: 'Finish a task',
            text: 'Earn coins and XP for your real-life wins.',
          },
          {
            icon: 'heart',
            title: 'Care for your friend',
            text: 'Feed and play to lift their mood.',
          },
          {
            icon: 'shop',
            title: 'Make it yours',
            text: 'Buy snacks, room items, and backgrounds.',
          },
          { icon: 'gift', title: 'Daily bonus', text: '3 quests = 20 extra coins.' },
        ].map((step) => (
          <div key={step.title}>
            <span>
              <Icon name={step.icon} size={23} />
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          </div>
        ))}
        <button className="button primary full-width" onClick={onClose}>
          Got it
          <Icon name="check" size={17} />
        </button>
      </div>
    </Dialog>
  );
}
export function SmallLink({ to, children }) {
  return (
    <Link to={to} className="text-link">
      {children}
      <Icon name="arrow" size={16} />
    </Link>
  );
}
