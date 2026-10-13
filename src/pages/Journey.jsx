import { useState } from 'react';
import { useGame } from '../context';
import { BADGES, dayKey, levelFor, metricsFor } from '../../shared/game';
import { Progress } from '../components/GameUI';
import { ScreenHeading, Segments, Pager } from '../components/PhoneUI';
import Icon from '../components/Icon';
import Dialog from '../components/Dialog';
export default function Journey() {
  const { state, now } = useGame();
  const [tab, setTab] = useState('badges'),
    [badge, setBadge] = useState(null),
    [page, setPage] = useState(0);
  const metrics = metricsFor(state, now),
    today = dayKey(now, state.timezone);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6 + i);
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en', { weekday: 'narrow', timeZone: 'UTC' }),
      count: state.completions.filter((c) => c.day === d.toISOString().slice(0, 10)).length,
    };
  });
  const max = Math.max(3, ...days.map((d) => d.count));
  return (
    <div className="compact-page stats-page">
      <ScreenHeading title="Stats">
        <span className="level-chip">
          <Icon name="star" size={15} />
          Lv. {levelFor(state.xp)}
        </span>
      </ScreenHeading>
      <div className="mini-stats">
        {[
          { icon: 'flag', value: metrics.quests, label: 'Quests' },
          { icon: 'flame', value: metrics.streak, label: 'Streak' },
          { icon: 'star', value: state.xp, label: 'XP' },
          { icon: 'heart', value: state.careCount, label: 'Care' },
        ].map((s) => (
          <div key={s.label}>
            <Icon name={s.icon} size={18} />
            <strong>{s.value}</strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>
      <section className="panel mini-week">
        <div className="compact-list-head">
          <strong>This week</strong>
          <span>{days.reduce((n, d) => n + d.count, 0)} wins</span>
        </div>
        <div
          className="weekly-chart"
          role="img"
          aria-label={days.map((d) => `${d.key}: ${d.count} quests`).join(', ')}
        >
          {days.map((d) => (
            <div className={`chart-day ${d.key === today ? 'today' : ''}`} key={d.key}>
              <span className="chart-count">{d.count}</span>
              <div className="chart-track">
                <div style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }} />
              </div>
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </section>
      <Segments
        label="Stats view"
        options={[
          { id: 'badges', name: 'Badges', icon: 'trophy' },
          { id: 'activity', name: 'Activity', icon: 'clock' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'badges' ? (
        <div className="mini-badges">
          {BADGES.map((b) => {
            const unlocked = metrics[b.metric] >= b.target;
            return (
              <button
                key={b.id}
                className={unlocked ? 'earned' : ''}
                onClick={() => setBadge(b)}
                aria-label={`${b.name}, ${unlocked ? 'earned' : `${Math.min(metrics[b.metric], b.target)} of ${b.target}`}`}
              >
                <Icon name={b.icon} size={25} />
                <strong>{b.name}</strong>
                <small>
                  {unlocked ? (
                    <Icon name="check" size={12} />
                  ) : (
                    `${Math.min(metrics[b.metric], b.target)}/${b.target}`
                  )}
                </small>
              </button>
            );
          })}
        </div>
      ) : (
        <section className="panel mini-activity">
          {state.activity.slice(page * 5, (page + 1) * 5).map((a) => (
            <div key={a.id} className="activity-row">
              <Icon
                name={
                  a.type === 'task.complete' ? 'flag' : a.type.startsWith('item') ? 'heart' : 'paw'
                }
                size={17}
              />
              <div>
                <strong>{a.message}</strong>
                <small>
                  {new Intl.DateTimeFormat('en', {
                    timeZone: state.timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  }).format(a.at)}
                </small>
              </div>
            </div>
          ))}
          {!state.activity.length && (
            <div className="compact-empty">
              <Icon name="compass" size={25} />
              <strong>Your journey starts here</strong>
            </div>
          )}
          <Pager page={page} count={Math.ceil(state.activity.length / 5)} onChange={setPage} />
        </section>
      )}
      <div className="level-strip">
        <Icon name="sprout" size={17} />
        <Progress value={state.xp % 150} max={150} label="Next level progress" />
        <small>
          {150 - (state.xp % 150)} XP to Lv. {levelFor(state.xp) + 1}
        </small>
      </div>
      {badge && (
        <Dialog title={badge.name} onClose={() => setBadge(null)}>
          <div className="dialog-body badge-detail">
            <Icon name={badge.icon} size={48} />
            <p>{badge.description}</p>
            <Progress value={metrics[badge.metric]} max={badge.target} label="Milestone progress" />
            <strong>
              {Math.min(metrics[badge.metric], badge.target)} / {badge.target}
            </strong>
          </div>
        </Dialog>
      )}
    </div>
  );
}
