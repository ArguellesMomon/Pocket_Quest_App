import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../context';
import { CATALOG, levelFor, petStats } from '../../shared/game';
import { SELECTABLE_COMPANIONS, MOODS, moodFor } from '../../shared/companions';
import Icon from './Icon';
import Dialog from './Dialog';
import SpritePet from './SpritePet';
import { ItemArt, HabitatArt } from './PixelArt';
import { Progress } from './GameUI';
import FocusCard from './FocusCard';
export const GROUPS = [
  { id: 'care', name: 'Care', icon: 'utensils', categories: ['Food', 'Toys'] },
  { id: 'room', name: 'Room', icon: 'home', categories: ['Decor', 'Habitats'] },
  { id: 'backgrounds', name: 'Scenes', icon: 'scene', categories: ['Backgrounds'] },
];
export function ScreenHeading({ title, children, subtitle }) {
  return (
    <header className="screen-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className="screen-heading-actions">{children}</div>
    </header>
  );
}
export function Segments({ options, value, onChange, label }) {
  return (
    <div className="segments" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          className={value === o.id ? 'active' : ''}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.icon && <Icon name={o.icon} size={17} />}
          <span>{o.name}</span>
          {o.count !== undefined && <small>{o.count}</small>}
        </button>
      ))}
    </div>
  );
}
export function PetMeters() {
  const { state, now } = useGame();
  const stats = petStats(state, now);
  return (
    <div className="pet-meters">
      {[
        { value: stats.joy, name: 'Joy', icon: 'heart', color: 'pink' },
        { value: stats.energy, name: 'Energy', icon: 'zap', color: 'gold' },
      ].map((s) => (
        <div key={s.name}>
          <span>
            <Icon name={s.icon} size={14} />
            <strong>{s.value}</strong>
            <small>{s.name}</small>
          </span>
          <Progress value={s.value} label={`Companion ${s.name.toLowerCase()}`} color={s.color} />
        </div>
      ))}
      <div>
        <span>
          <Icon name="star" size={14} />
          <strong>{levelFor(state.xp)}</strong>
          <small>Level</small>
        </span>
        <Progress value={state.xp % 150} max={150} label="Progress to next level" />
      </div>
    </div>
  );
}
export function PetScene({ large = false }) {
  const { state, now } = useGame();
  const [helloUntil, setHelloUntil] = useState(0);
  const mood = moodFor(state, petStats(state, now), now, helloUntil > now),
    definition = MOODS[mood];
  return (
    <section className={`pet-scene ${large ? 'large' : ''}`}>
      <div className="pet-scene-labels">
        <strong>
          {state.pet.name}
          <span>Lv. {levelFor(state.xp)}</span>
        </strong>
        <span className={`mood-pill ${mood}`}>
          <Icon name={definition.icon} size={13} />
          {definition.label}
        </span>
      </div>
      <HabitatArt state={state} mood={mood} onPet={() => setHelloUntil(Date.now() + 5000)} />
      <PetMeters />
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
  );
}
export function QuickCare({ focus = false }) {
  const { state, user, now, act, busy, pendingAction } = useGame();
  const [drawer, setDrawer] = useState(null);
  let remaining = null;
  try {
    const saved = JSON.parse(localStorage.getItem(`pocketquest-focus:${user?.id || 'guest'}`));
    if (saved?.started)
      remaining = saved.end ? Math.max(0, Math.ceil((saved.end - now) / 1000)) : saved.remaining;
  } catch {}
  const locked = busy || pendingAction;
  return (
    <>
      <div className="quick-care">
        <button
          disabled={locked || (!state.inventory.berry && state.coins < 15)}
          onClick={() => act({ type: 'item.care', itemId: 'berry' })}
          aria-label={
            state.inventory.berry
              ? 'Feed companion a berry bite'
              : 'Buy and feed a berry bite for 15 coins'
          }
        >
          <ItemArt type="berry" />
          <span>
            Feed<small>{state.inventory.berry ? `×${state.inventory.berry}` : '15 coins'}</small>
          </span>
        </button>
        <button
          disabled={locked || (!state.inventory.ball && state.coins < 20)}
          onClick={() => act({ type: 'item.care', itemId: 'ball' })}
          aria-label={
            state.inventory.ball ? 'Play with companion' : 'Buy and play with yarn for 20 coins'
          }
        >
          <ItemArt type="ball" />
          <span>
            Play<small>{state.inventory.ball ? `×${state.inventory.ball}` : '20 coins'}</small>
          </span>
        </button>
        {focus && (
          <button aria-label="Focus" onClick={() => setDrawer('focus')}>
            <Icon name="clock" size={23} />
            <span>
              Focus
              {remaining !== null && (
                <small>
                  {remaining > 0
                    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                    : 'Ready'}
                </small>
              )}
            </span>
          </button>
        )}
        <button onClick={() => setDrawer('bag')}>
          <Icon name="backpack" size={23} />
          <span>Bag</span>
        </button>
      </div>
      {drawer && (
        <Dialog title={drawer === 'focus' ? 'Focus' : 'Backpack'} onClose={() => setDrawer(null)}>
          <div className="dialog-body">
            {drawer === 'focus' ? <FocusCard /> : <ItemBrowser mode="bag" />}
          </div>
        </Dialog>
      )}
    </>
  );
}
export function ItemBrowser({ mode = 'shop' }) {
  const { state, act, busy, pendingAction } = useGame();
  const [params, setParams] = useSearchParams();
  const [bagGroup, setBagGroup] = useState('care'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState(null);
  const group =
    mode === 'shop' && GROUPS.some((g) => g.id === params.get('tab'))
      ? params.get('tab')
      : bagGroup;
  const setGroup = (value) => {
    setPage(0);
    setBagGroup(value);
    if (mode === 'shop') setParams({ tab: value }, { replace: true });
  };
  const level = levelFor(state.xp),
    categories = GROUPS.find((g) => g.id === group).categories;
  const items = CATALOG.filter(
    (i) => categories.includes(i.category) && (mode === 'shop' || state.inventory[i.id] > 0),
  );
  if (group === 'backgrounds') {
    items.sort((a, b) => a.level - b.level || a.cost - b.cost);
    items.unshift({
      id: 'daydream',
      name: 'Dream garden',
      category: 'Backgrounds',
      art: 'daydream',
      level: 1,
      free: true,
      description: 'Your little patch of daydream. Always yours.',
    });
  }
  const pageSize = mode === 'bag' ? (window.innerHeight < 700 ? 1 : 2) : 4;
  const pages = Math.ceil(items.length / pageSize),
    pageIndex = Math.min(page, Math.max(0, pages - 1));
  const visibleItems = items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const effect = (item) =>
    item.consumable ? (
      <>
        <Icon name={item.energy ? 'zap' : 'heart'} size={12} />+{item.energy || item.joy}
        {item.energy && item.joy ? (
          <>
            <Icon name="heart" size={12} />+{item.joy}
          </>
        ) : null}
      </>
    ) : (
      <>
        <Icon name={item.category === 'Backgrounds' ? 'scene' : 'home'} size={12} />
        {item.category === 'Backgrounds'
          ? 'Background'
          : item.category === 'Habitats'
            ? 'Habitat'
            : 'Decor'}
      </>
    );
  const equipped = (item) =>
    state.equipped.decor.includes(item.id) ||
    (item.free ? !state.equipped.background : state.equipped.background === item.id) ||
    state.equipped.habitat === item.id;
  const action = (item) => {
    if (item.free) return { type: 'background.reset' };
    const owned = state.inventory[item.id] > 0;
    return mode === 'bag' || (!item.consumable && owned)
      ? { type: 'item.use', itemId: item.id }
      : { type: 'item.buy', itemId: item.id, equip: !item.consumable };
  };
  const actionName = (item) =>
    item.free
      ? equipped(item)
        ? 'Applied'
        : 'Apply'
      : action(item).type === 'item.buy'
        ? 'Buy'
        : item.consumable
          ? 'Use'
          : equipped(item)
            ? item.category === 'Backgrounds'
              ? 'Reset'
              : 'Remove'
            : 'Apply';
  const unavailable = (item) =>
    level < item.level ||
    busy ||
    pendingAction ||
    (item.free && equipped(item)) ||
    (action(item).type === 'item.buy' && state.coins < item.cost);
  return (
    <div className={`item-browser ${mode}`}>
      <Segments label="Item category" options={GROUPS} value={group} onChange={setGroup} />
      <div className="compact-items">
        {items.length ? (
          visibleItems.map((item) => (
            <article
              className={`item-tile ${item.category === 'Backgrounds' ? 'scene-tile' : ''} ${equipped(item) ? 'is-applied' : ''} ${level < item.level ? 'locked' : ''}`}
              key={item.id}
            >
              <button
                className={`item-preview ${item.category.toLowerCase()}`}
                onClick={() => setSelected(item)}
                aria-label={`Details for ${item.name}`}
              >
                <ItemArt type={item.art} />
                {(item.free || state.inventory[item.id] > 0) && (
                  <span className="quantity-chip">
                    {item.consumable ? (
                      `×${state.inventory[item.id]}`
                    ) : equipped(item) ? (
                      <>
                        <Icon name="check" size={12} />
                        {mode === 'shop' && 'Applied'}
                      </>
                    ) : mode === 'shop' ? (
                      <>Owned</>
                    ) : (
                      <Icon name="backpack" size={12} />
                    )}
                  </span>
                )}
              </button>
              <div className="item-tile-info">
                <h3>{item.name}</h3>
                <span className="item-effect">{effect(item)}</span>
              </div>
              <div className="item-tile-actions">
                <button
                  className="item-action"
                  disabled={unavailable(item)}
                  title={
                    level < item.level
                      ? `Unlocks at level ${item.level}`
                      : action(item).type === 'item.buy' && state.coins < item.cost
                        ? `Earn ${item.cost - state.coins} more coins`
                        : undefined
                  }
                  aria-label={
                    level < item.level
                      ? `${item.name} unlocks at level ${item.level}`
                      : `${actionName(item)} ${item.name}${action(item).type === 'item.buy' ? ` for ${item.cost} coins` : ''}`
                  }
                  onClick={() => act(action(item))}
                >
                  {level < item.level ? (
                    <>
                      <Icon name="lock" size={13} />
                      Lv. {item.level}
                      <Icon name="coins" size={12} />
                      {item.cost}
                    </>
                  ) : action(item).type === 'item.buy' ? (
                    <>
                      Buy
                      <Icon name="coins" size={14} />
                      {item.cost}
                    </>
                  ) : (
                    <>
                      <Icon
                        name={
                          item.consumable
                            ? 'heart'
                            : equipped(item)
                              ? item.free
                                ? 'check'
                                : 'reset'
                              : 'check'
                        }
                        size={15}
                      />
                      {actionName(item)}
                    </>
                  )}
                </button>
                {mode === 'shop' && item.consumable && state.inventory[item.id] > 0 && (
                  <button
                    className="item-use-action"
                    disabled={busy || pendingAction}
                    aria-label={`Use ${item.name}`}
                    onClick={() => act({ type: 'item.use', itemId: item.id })}
                  >
                    <Icon name={item.category === 'Food' ? 'utensils' : 'play'} size={13} /> Use
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="compact-empty">
            <Icon name="backpack" size={28} />
            <strong>Nothing here yet</strong>
            <Link className="button secondary" to="/market">
              Shop
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        )}
      </div>
      <Pager page={pageIndex} count={pages} onChange={setPage} />
      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <div className="dialog-body item-detail">
            {selected.category === 'Backgrounds' ? (
              <HabitatArt
                state={{
                  ...state,
                  equipped: { ...state.equipped, background: selected.free ? null : selected.id },
                }}
              />
            ) : (
              <ItemArt type={selected.art} />
            )}
            <p>{selected.description}</p>
            <span className="item-effect">{effect(selected)}</span>
            <button
              className="button primary full-width"
              disabled={unavailable(selected)}
              onClick={async () => {
                if (await act(action(selected))) setSelected(null);
              }}
            >
              {level < selected.level ? (
                <>
                  <Icon name="lock" size={16} />
                  Level {selected.level}
                </>
              ) : (
                <>
                  {actionName(selected)}
                  {action(selected).type === 'item.buy' && (
                    <>
                      <Icon name="coins" size={17} />
                      {selected.cost}
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
export function CompanionPicker({ value, onChange, busy = false, preview = false }) {
  return (
    <div className="companion-picker">
      {SELECTABLE_COMPANIONS.map((c) => (
        <button
          className={value === c.id ? 'selected' : ''}
          key={c.id}
          disabled={busy}
          aria-pressed={value === c.id}
          aria-label={`Choose ${c.name}, ${c.type}`}
          onClick={() => onChange(c.id)}
        >
          <SpritePet species={c.id} mood={preview && value === c.id ? 'playful' : 'idle'} />
          <strong>{c.name}</strong>
          <small>
            <Icon name={c.type === 'Cat' ? 'cat' : 'dog'} size={11} />
            {c.type}
          </small>
          {value === c.id && (
            <span className="selection-check">
              <Icon name="check" size={12} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
export function Pager({ page, count, onChange }) {
  if (count <= 1) return null;
  return (
    <div className="pager">
      <button
        className="icon-button"
        aria-label="Previous page"
        disabled={!page}
        onClick={() => onChange(page - 1)}
      >
        <Icon name="back" size={18} />
      </button>
      <span>
        {page + 1} / {count}
      </span>
      <button
        className="icon-button"
        aria-label="Next page"
        disabled={page >= count - 1}
        onClick={() => onChange(page + 1)}
      >
        <Icon name="arrow" size={18} />
      </button>
    </div>
  );
}
