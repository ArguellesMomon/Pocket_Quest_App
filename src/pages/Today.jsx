import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context';
import { completed, dayKey } from '../../shared/game';
import Icon from '../components/Icon';
import { QuestRow, Progress } from '../components/GameUI';
import { ScreenHeading, PetScene, QuickCare } from '../components/PhoneUI';
export default function Today() {
  const { state, now, addQuest } = useGame();
  const [tab, setTab] = useState('next');
  const today = dayKey(now, state.timezone),
    done = state.completions.filter((c) => c.day === today).length;
  const active = state.tasks
      .filter((t) => !completed(state, t, now))
      .sort((a, b) => b.createdAt - a.createdAt),
    finished = state.tasks.filter((t) => completed(state, t, now));
  const tasks = (tab === 'next' ? active : finished).slice(
    0,
    window.innerHeight < 700 ? 2 : window.innerHeight >= 820 ? 4 : 3,
  );
  const date = new Intl.DateTimeFormat('en', {
    timeZone: state.timezone,
    month: 'short',
    day: 'numeric',
  }).format(now);
  return (
    <div className="compact-page today-page">
      <ScreenHeading title="Today" subtitle={date}>
        <button
          className="button primary new-quest-button"
          onClick={addQuest}
          aria-label="Add a quest"
        >
          <Icon name="plus" size={16} />
          New quest
        </button>
      </ScreenHeading>
      <PetScene />
      <QuickCare focus />
      <div className="daily-target">
        <Icon name="target" size={18} />
        <strong>
          {done}/{state.settings.dailyGoal}
        </strong>
        <Progress value={done} max={state.settings.dailyGoal} label="Daily quest goal" />
        <span
          title="Three completed quests earn 20 bonus coins"
          className={state.bonusDays.includes(today) ? 'bonus-earned' : ''}
        >
          <Icon name={state.bonusDays.includes(today) ? 'check' : 'gift'} size={16} />
          +20
        </span>
      </div>
      <section className="compact-quest-panel panel">
        <div className="compact-section-head">
          <div className="tabs">
            <button className={tab === 'next' ? 'active' : ''} onClick={() => setTab('next')}>
              Next up <span>{active.length}</span>
            </button>
            <button className={tab === 'done' ? 'active' : ''} onClick={() => setTab('done')}>
              Done <span>{done}</span>
            </button>
          </div>
          <Link className="icon-button" to="/quests" aria-label="View all quests">
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="today-quests">
          {tasks.length ? (
            tasks.map((t) => <QuestRow task={t} key={t.id} />)
          ) : (
            <div className="compact-empty">
              <Icon name={tab === 'next' ? 'done' : 'flag'} size={25} />
              <strong>{tab === 'next' ? 'All done!' : 'Your first win awaits'}</strong>
              {tab === 'next' && (
                <button className="text-link" onClick={addQuest}>
                  <Icon name="plus" size={15} />
                  New quest
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
