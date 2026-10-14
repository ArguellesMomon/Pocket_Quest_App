import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameContext, useGame } from '../context';
import {
  applyAction,
  completed,
  dayKey,
  DIFFICULTIES,
  levelFor,
  petStats,
} from '../../shared/game';
import { moodFor, MOODS } from '../../shared/companions';
import { categoryIcons, Progress } from '../components/GameUI';
import { ScreenHeading, QuickCare } from '../components/PhoneUI';
import { HabitatArt } from '../components/PixelArt';
import SpritePet from '../components/SpritePet';
import Icon from '../components/Icon';
import Dialog from '../components/Dialog';
import FocusCard from '../components/FocusCard';
import CompanionChat from '../components/CompanionChat';
import { feedback } from '../lib/feedback';
import '../styles/today.css';

export default function Today() {
  const game = useGame();
  const { state, now, busy } = game;
  const [selected, setSelected] = useState(null),
    [drawer, setDrawer] = useState(null);
  const [receipt, setReceipt] = useState(null),
    [helloUntil, setHelloUntil] = useState(0);
  const completing = useRef(false),
    nextButton = useRef(null),
    completeButton = useRef(null),
    hadReward = useRef(false);
  const today = dayKey(now, state.timezone);
  const wins = state.completions.filter((win) => win.day === today).sort((a, b) => b.at - a.at);
  const done = wins.length,
    bonus = state.bonusDays.includes(today);
  const rank = (task) => (task.due && task.due < today ? 0 : task.due === today ? 1 : 2);
  const active = state.tasks
    .filter((task) => !completed(state, task, now))
    .sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);
  const task = active.find((item) => item.id === selected) || active[0];
  const index = task ? active.findIndex((item) => item.id === task.id) : 0;
  const stats = petStats(state, now),
    level = levelFor(state.xp);
  const mood = moodFor(state, stats, now, helloUntil > now);
  const earned =
    receipt && state.completions.some((win) => win.taskId === receipt.taskId && win.day === today);
  useEffect(() => {
    if (earned && !drawer) {
      hadReward.current = true;
      nextButton.current?.focus();
    } else if (!earned && !drawer && hadReward.current) {
      hadReward.current = false;
      completeButton.current?.focus();
    }
  }, [earned, drawer]);
  const cue = (kind = 'tap') =>
    feedback(kind, { sound: state.settings.sound, haptics: game.audio.haptics });
  async function act(action) {
    if (completing.current) return false;
    completing.current = true;
    let reward;
    try {
      if (action.type === 'task.complete') {
        const projected = applyAction(state, { ...action, id: crypto.randomUUID() }, now).state;
        reward = {
          taskId: action.taskId,
          coins: projected.coins - state.coins,
          xp: projected.xp - state.xp,
          bonus: !bonus && projected.bonusDays.includes(today),
          level: levelFor(projected.xp),
          levelUp: levelFor(projected.xp) > level,
        };
      }
      const success = await game.act(action, { quiet: true, sound: false });
      if (success) {
        if (reward) {
          setReceipt(reward);
          cue('reward');
        } else if (['item.care', 'item.use'].includes(action.type)) cue('care');
      } else cue('error');
      return success;
    } catch (error) {
      game.toast(error.message || 'Could not complete that action.', 'error');
      cue('error');
      return false;
    } finally {
      completing.current = false;
    }
  }
  function newQuest() {
    setReceipt(null);
    setSelected(null);
    game.addQuest();
  }
  function choose(id) {
    setSelected(id);
    setReceipt(null);
    setDrawer(null);
  }
  const date = new Intl.DateTimeFormat('en', {
    timeZone: state.timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now);
  const reward = task && DIFFICULTIES[task.difficulty];
  return (
    <GameContext.Provider value={{ ...game, act, addQuest: newQuest }}>
      <div
        className="compact-page today-page today-play"
        onClickCapture={(event) => {
          if (event.target.closest('button,a')) cue();
        }}
      >
        <ScreenHeading title="Today" subtitle={date}>
          <button
            className="button primary new-quest-button"
            aria-label="New task"
            onClick={newQuest}
          >
            <Icon name="plus" size={16} /> New task
          </button>
        </ScreenHeading>
        <div className="today-play-layout">
          <div className="today-world-column">
            <section className="pet-scene today-world" aria-label="Your companion's world">
              <div className="pet-scene-labels">
                <strong>
                  {state.pet.name}
                  <span>Lv. {level}</span>
                </strong>
                <button
                  className="today-chat-shortcut"
                  aria-label={`Talk to ${state.pet.name}`}
                  onClick={() => setDrawer('chat')}
                >
                  <Icon name="chat" size={14} />
                  <span>Talk</span>
                </button>
              </div>
              <HabitatArt
                state={state}
                mood={mood}
                onPet={() => setHelloUntil(Date.now() + 4000)}
              />
              {helloUntil > now && (
                <div className="today-hello" role="status">
                  {state.pet.name} is happy to see you!
                </div>
              )}
              <div className="today-world-status">
                <span className="today-mood">
                  <Icon name={MOODS[mood].icon} size={13} />
                  {MOODS[mood].label}
                </span>
                <span title="Joy">
                  <Icon name="heart" size={13} />
                  <strong>{stats.joy}</strong>
                </span>
                <span title="Energy">
                  <Icon name="zap" size={13} />
                  <strong>{stats.energy}</strong>
                </span>
                <div className="today-level">
                  <Progress value={state.xp % 150} max={150} label="Progress to next level" />
                  <small>
                    {150 - (state.xp % 150)} XP to Lv. {level + 1}
                  </small>
                </div>
              </div>
              {mood === 'celebrating' && (
                <div className="win-particles" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} style={{ '--particle': i }}>
                      ✦
                    </span>
                  ))}
                </div>
              )}
            </section>
            <QuickCare focus onFocus={() => setDrawer('focus')} />
          </div>
          <div className="today-quest-column">
            <button
              className={`today-trail ${bonus ? 'is-earned' : ''}`}
              aria-label="View today's progress and daily bonus"
              aria-describedby="today-goal-status"
              onClick={() => setDrawer('wins')}
            >
              <span className="today-trail-goal" id="today-goal-status">
                <Icon name="target" size={16} />
                <strong>
                  {done}/{state.settings.dailyGoal}
                </strong>
                <small>today</small>
              </span>
              <span className="today-trail-steps" aria-hidden="true">
                {[1, 2, 3].map((step) => (
                  <span className={done >= step ? 'complete' : ''} key={step}>
                    {done >= step ? <Icon name="check" size={11} /> : step}
                  </span>
                ))}
              </span>
              <span className="today-trail-prize">
                <Icon name={bonus ? 'check' : 'gift'} size={15} />
                {bonus ? 'Bonus earned' : '+20'}
              </span>
            </button>
            <div className="today-deck-head">
              <button
                className="today-queue-button"
                onClick={() => setDrawer('queue')}
                aria-label={`Choose a quest, ${active.length} remaining`}
              >
                <Icon name="tasks" size={16} />
                Up next <small>{active.length}</small>
                <Icon name="down" size={13} />
              </button>
              <div className="today-deck-pager">
                <button
                  className="icon-button"
                  aria-label="Previous quest"
                  disabled={earned || active.length < 2}
                  onClick={() => choose(active[(index - 1 + active.length) % active.length].id)}
                >
                  <Icon name="back" size={16} />
                </button>
                <small>{active.length ? `${index + 1}/${active.length}` : '0/0'}</small>
                <button
                  className="icon-button"
                  aria-label="Next quest in deck"
                  disabled={earned || active.length < 2}
                  onClick={() => choose(active[(index + 1) % active.length].id)}
                >
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </div>
            {earned ? (
              <section
                className={`today-quest-card today-reward ${receipt.bonus ? 'bonus-reward' : ''}`}
                aria-label="Quest reward"
              >
                <div className="today-reward-art">
                  <SpritePet species={state.pet.species} mood="celebrating" />
                  <span aria-hidden="true">✦</span>
                </div>
                <div className="today-reward-heading">
                  <span className="today-eyebrow">
                    {receipt.levelUp
                      ? `LEVEL ${receipt.level} UNLOCKED`
                      : receipt.bonus
                        ? 'DAILY BONUS UNLOCKED'
                        : 'TASK COMPLETE'}
                  </span>
                  <h2>
                    {receipt.levelUp
                      ? `${state.pet.name} leveled up!`
                      : receipt.bonus
                        ? 'Three wins. Extra treasure.'
                        : 'A little win. A big step.'}
                  </h2>
                </div>
                <div className="today-loot" role="status">
                  <span>
                    <Icon name="coins" size={20} />
                    <strong>+{receipt.coins}</strong>
                    <small>coins</small>
                  </span>
                  <span>
                    <Icon name="star" size={20} />
                    <strong>+{receipt.xp}</strong>
                    <small>XP</small>
                  </span>
                </div>
                <button
                  ref={nextButton}
                  className="button primary today-main-action"
                  onClick={() => {
                    setReceipt(null);
                    setSelected(null);
                  }}
                >
                  {active.length ? 'Next task' : 'Back to my day'}
                  <Icon name="arrow" size={18} />
                </button>
              </section>
            ) : task ? (
              <section className="today-quest-card" key={task.id} aria-label="Current quest">
                <div className="today-quest-meta">
                  <span className={`today-category ${task.category.toLowerCase()}`}>
                    <Icon name={categoryIcons[task.category]} size={15} />
                    {task.category}
                  </span>
                  <span>
                    {task.due && task.due <= today
                      ? task.due < today
                        ? 'Overdue'
                        : 'Due today'
                      : task.recurrence === 'daily'
                        ? 'Daily ritual'
                        : reward.label}
                  </span>
                </div>
                <div className="today-quest-title">
                  <span className="today-eyebrow">ONE THING AT A TIME</span>
                  <button
                    aria-label={`View quest ${task.title}`}
                    onClick={() => setDrawer('detail')}
                  >
                    <h2>{task.title}</h2>
                    <Icon name="right" size={18} />
                  </button>
                  <p>{task.notes || 'One thing at a time. You’ve got this.'}</p>
                </div>
                <div className="today-quest-rewards">
                  <span>
                    <Icon name="coins" size={16} />+{reward.coins}
                  </span>
                  <span>
                    <Icon name="star" size={16} />+{reward.xp} XP
                  </span>
                  <small>{reward.label} effort</small>
                </div>
                <div className="today-quest-actions">
                  <button
                    className="button secondary today-focus-action"
                    aria-label={`Focus on ${task.title}`}
                    onClick={() => setDrawer('focus')}
                  >
                    <Icon name="clock" size={19} />
                    <span>Focus</span>
                  </button>
                  <button
                    className="button primary today-main-action"
                    aria-label={`Complete ${task.title}`}
                    ref={completeButton}
                    disabled={busy}
                    onClick={() => act({ type: 'task.complete', taskId: task.id })}
                  >
                    <Icon name="check" size={18} />
                    Done
                  </button>
                </div>
              </section>
            ) : (
              <section className="today-quest-card today-all-done">
                <SpritePet species={state.pet.species} mood="happy" />
                <span className="today-eyebrow">ROOM TO BREATHE</span>
                <h2>{done ? 'You did good today.' : 'Your next adventure starts here.'}</h2>
                <p>{done ? 'Enjoy a moment with your companion.' : 'Start with one small task.'}</p>
                <button className="button primary today-main-action" onClick={newQuest}>
                  <Icon name="plus" size={17} />
                  Add task
                </button>
              </section>
            )}
          </div>
        </div>
        {drawer === 'chat' && <CompanionChat onClose={() => setDrawer(null)} />}
        {drawer === 'focus' && (
          <Dialog title="Focus" onClose={() => setDrawer(null)}>
            <div className="dialog-body today-focus-sheet">
              <FocusCard initialTaskId={task?.id} />
            </div>
          </Dialog>
        )}
        {drawer === 'queue' && (
          <QuestQueue
            tasks={active}
            selected={task?.id}
            onChoose={choose}
            onClose={() => setDrawer(null)}
          />
        )}
        {drawer === 'wins' && (
          <TodayWins
            wins={wins}
            goal={state.settings.dailyGoal}
            bonus={bonus}
            onClose={() => setDrawer(null)}
          />
        )}
        {drawer === 'detail' && task && (
          <Dialog title={task.title} subtitle={task.category} onClose={() => setDrawer(null)}>
            <div className="dialog-body today-detail">
              <p>{task.notes || 'One small step at a time.'}</p>
              {task.due && <small>Due {task.due}</small>}
              <div className="dialog-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    setDrawer(null);
                    game.editQuest(task);
                  }}
                >
                  <Icon name="edit" size={17} />
                  Edit task
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (await act({ type: 'task.complete', taskId: task.id })) setDrawer(null);
                  }}
                >
                  <Icon name="check" size={17} />
                  Complete
                </button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </GameContext.Provider>
  );
}

function QuestQueue({ tasks, selected, onChoose, onClose }) {
  const [page, setPage] = useState(
    Math.max(0, Math.floor(tasks.findIndex((task) => task.id === selected) / 3)),
  );
  const count = Math.max(1, Math.ceil(tasks.length / 3));
  return (
    <Dialog title="Choose your next quest" onClose={onClose}>
      <div className="dialog-body today-queue-sheet">
        {tasks.slice(page * 3, page * 3 + 3).map((task) => (
          <button
            className={`today-queue-item ${task.id === selected ? 'selected' : ''}`}
            key={task.id}
            onClick={() => onChoose(task.id)}
          >
            <span className={`today-category ${task.category.toLowerCase()}`}>
              <Icon name={categoryIcons[task.category]} size={18} />
            </span>
            <span>
              <strong>{task.title}</strong>
              <small>
                {task.category} · +{DIFFICULTIES[task.difficulty].coins} coins
              </small>
            </span>
            <Icon name={task.id === selected ? 'check' : 'right'} size={17} />
          </button>
        ))}
        {!tasks.length && <p>All caught up. Enjoy your little world.</p>}
        {count > 1 && (
          <div className="today-sheet-pager">
            <button
              className="icon-button"
              aria-label="Previous quest page"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              <Icon name="back" />
            </button>
            <small>
              {page + 1}/{count}
            </small>
            <button
              className="icon-button"
              aria-label="Next quest page"
              disabled={page >= count - 1}
              onClick={() => setPage((value) => value + 1)}
            >
              <Icon name="arrow" />
            </button>
          </div>
        )}
        <Link
          to="/quests"
          className="button secondary full-width"
          aria-label="View all quests"
          onClick={onClose}
        >
          Open quest journal
          <Icon name="arrow" size={17} />
        </Link>
      </div>
    </Dialog>
  );
}
function TodayWins({ wins, goal, bonus, onClose }) {
  const [page, setPage] = useState(0),
    pages = Math.max(1, Math.ceil(wins.length / 3));
  return (
    <Dialog title="Today's wins" onClose={onClose}>
      <div className="dialog-body today-wins-sheet">
        <div className="today-win-summary">
          <strong>
            {wins.length}
            <small>/{goal} quests</small>
          </strong>
          <Progress value={wins.length} max={goal} label="Daily quest goal" />
        </div>
        <div className={`today-bonus-summary ${bonus ? 'earned' : ''}`}>
          <Icon name={bonus ? 'gift' : 'lock'} size={23} />
          <div>
            <strong>
              {bonus
                ? 'Daily treasure earned'
                : `${Math.max(0, 3 - wins.length)} more ${3 - wins.length === 1 ? 'win' : 'wins'} to daily treasure`}
            </strong>
            <small>3 quests → +20 coins & +25 XP</small>
          </div>
        </div>
        {wins.slice(page * 3, page * 3 + 3).map((win, index) => (
          <div className="today-win-row" key={`${win.taskId}:${win.at}:${index}`}>
            <Icon name="done" size={19} />
            <strong>{win.title}</strong>
            <small>+{win.coins}</small>
          </div>
        ))}
        {!wins.length && <p className="today-sheet-empty">Your first small win awaits.</p>}
        {pages > 1 && (
          <div className="today-sheet-pager">
            <button
              className="icon-button"
              aria-label="Previous wins page"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              <Icon name="back" />
            </button>
            <small>
              {page + 1}/{pages}
            </small>
            <button
              className="icon-button"
              aria-label="Next wins page"
              disabled={page >= pages - 1}
              onClick={() => setPage((value) => value + 1)}
            >
              <Icon name="arrow" />
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
