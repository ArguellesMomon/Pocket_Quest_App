import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '../context';
import { CATEGORIES, DIFFICULTIES, completed } from '../../shared/game';
import { QuestRow } from '../components/GameUI';
import { ScreenHeading, Segments, Pager } from '../components/PhoneUI';
import Dialog from '../components/Dialog';
import Icon from '../components/Icon';
export default function Quests() {
  const { state, now, addQuest, act, busy } = useGame();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('active'),
    [category, setCategory] = useState('All'),
    [sort, setSort] = useState('newest'),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(false),
    [options, setOptions] = useState(false);
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('new')) {
      setParams({}, { replace: true });
      addQuest();
    }
  }, [params]);
  useEffect(() => setPage(0), [query, filter, category, sort]);
  const list = state.tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) &&
        (category === 'All' || t.category === category) &&
        (filter === 'all' || (filter === 'done') === completed(state, t, now)),
    )
    .sort((a, b) =>
      sort === 'reward'
        ? DIFFICULTIES[b.difficulty].coins - DIFFICULTIES[a.difficulty].coins
        : sort === 'due'
          ? (a.due || '9999').localeCompare(b.due || '9999')
          : b.createdAt - a.createdAt,
    );
  const size = window.innerHeight < 740 ? 4 : 5,
    pages = Math.max(1, Math.ceil(list.length / size)),
    current = Math.min(page, pages - 1);
  return (
    <div className="compact-page quests-page">
      <ScreenHeading title="Quests">
        <button
          className="icon-button"
          aria-label="Search quests"
          onClick={() => setSearch(!search)}
        >
          <Icon name="search" />
        </button>
        <button className="icon-button" aria-label="Quest filters" onClick={() => setOptions(true)}>
          <Icon name="filter" />
        </button>
        <button
          className="button primary new-quest-button"
          onClick={addQuest}
          aria-label="Add a quest"
        >
          <Icon name="plus" size={16} />
          New quest
        </button>
      </ScreenHeading>
      {search && (
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            autoFocus
            aria-label="Search quests"
            placeholder="Find a quest"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      )}
      <Segments
        label="Quest status"
        options={[
          { id: 'active', name: 'Active', icon: 'flag' },
          { id: 'done', name: 'Done', icon: 'done' },
          { id: 'all', name: 'All', icon: 'book' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <section className="panel quest-journal">
        <div className="compact-list-head">
          <span>
            {list.length} quests{category !== 'All' ? ` · ${category}` : ''}
          </span>
          <button className="text-link" onClick={() => setOptions(true)}>
            <Icon name="filter" size={13} />
            {sort === 'newest' ? 'Recent' : sort === 'reward' ? 'Reward' : 'Due'}
          </button>
        </div>
        <div className="paged-quests">
          {list.slice(current * size, (current + 1) * size).map((t) => (
            <QuestRow task={t} key={t.id} />
          ))}
          {!list.length && (
            <div className="compact-empty">
              <Icon name="flag" size={25} />
              <strong>
                {query
                  ? 'No matching quests'
                  : filter === 'done'
                    ? 'No completed quests yet'
                    : 'All clear'}
              </strong>
              <button className="text-link" onClick={addQuest}>
                <Icon name="plus" size={15} />
                New quest
              </button>
            </div>
          )}
        </div>
        <Pager page={current} count={pages} onChange={setPage} />
      </section>
      <button
        className="suggestion-shortcut"
        disabled={busy || state.tasks.some((t) => t.title === 'Stretch and breathe')}
        onClick={() =>
          act({
            type: 'task.create',
            taskId: crypto.randomUUID(),
            data: {
              title: 'Stretch and breathe',
              notes: 'Five calm breaths. A short stretch.',
              category: 'Wellbeing',
              difficulty: 'gentle',
              recurrence: 'daily',
              due: '',
            },
          })
        }
      >
        <Icon name="sparkles" size={17} />
        <span>Try a small ritual</span>
        <Icon name="plus" size={17} />
      </button>
      {options && (
        <Dialog title="Quest filters" onClose={() => setOptions(false)}>
          <div className="dialog-body filter-sheet">
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>All</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Recent</option>
                <option value="reward">Reward</option>
                <option value="due">Due date</option>
              </select>
            </label>
            <button className="button primary full-width" onClick={() => setOptions(false)}>
              Done
              <Icon name="check" size={17} />
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
