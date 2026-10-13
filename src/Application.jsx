import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { GameContext, useGame } from './context';
import { useGameState } from './hooks/useGameState';
import { completed, levelFor, streakFor } from '../shared/game';
import Icon from './components/Icon';
import { QuestEditor, HelpDialog } from './components/GameUI';
import { Welcome, Account } from './pages/Welcome';
import Today from './pages/Today';
import Quests from './pages/Quests';
import Habitat from './pages/Habitat';
import Market from './pages/Market';
import Journey from './pages/Journey';
import Preferences from './pages/Preferences';
const destinations = [
  { path: '/dashboard', label: 'Today', icon: 'sun' },
  { path: '/quests', label: 'Quests', icon: 'flag' },
  { path: '/habitat', label: 'Pets', icon: 'paw' },
  { path: '/market', label: 'Shop', icon: 'shop' },
  { path: '/journey', label: 'Stats', icon: 'trophy' },
];
export function Brand({ compact = false }) {
  return (
    <span className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-symbol">
        <Icon name="sprout" size={25} />
      </span>
      <span>
        pocket
        <span className="brand-quest">
          quest<span className="brand-dot">.</span>
        </span>
      </span>
    </span>
  );
}
function ThemeButton() {
  const { state, act, busy, pendingAction } = useGame();
  return (
    <button
      className="icon-button theme-toggle"
      aria-label="Toggle light and dark mode"
      disabled={busy || pendingAction}
      onClick={() =>
        act({
          type: 'settings.update',
          settings: {
            ...state.settings,
            theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
          },
        })
      }
    >
      <Icon name={document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'} size={19} />
    </button>
  );
}
function Shell({ children, onAdd, onHelp }) {
  const { state, user, busy, now, error, pendingAction, restore } = useGame();
  const location = useLocation();
  const active = destinations.find((d) => d.path === location.pathname);
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <NavLink className="brand-link" to="/dashboard" aria-label="Pocket Quest home">
          <Brand />
        </NavLink>
        <nav aria-label="Main navigation">
          {destinations.map((d) => (
            <NavLink
              key={d.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              to={d.path}
            >
              <Icon name={d.icon} />
              <span>{d.label}</span>
              {d.path === '/quests' && (
                <span className="nav-count">
                  {state.tasks.filter((t) => !completed(state, t, now)).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link" onClick={onHelp}>
            <Icon name="help" />
            <span>Field guide</span>
          </button>
          <NavLink to="/settings" className="nav-link">
            <Icon name="settings" />
            <span>Settings</span>
          </NavLink>
          <div className="profile-mini">
            <div className="avatar">{state.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{state.name}</strong>
              <span>{user ? 'Cloud adventure' : 'Guest adventurer'}</span>
            </div>
            <Icon name={user ? 'cloud' : 'sprout'} size={17} />
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-location">
            <span className="desktop-only">Your world</span>
            <Icon className="desktop-only" name="right" size={14} />
            <strong className="desktop-only">{active?.label || 'Settings'}</strong>
            <Brand compact />
          </div>
          <div className="topbar-actions">
            <span className="streak-pill" title="Consecutive days with a completed quest">
              <Icon name="flame" size={17} />
              <strong>{streakFor(state, now)}</strong>
              <span className="desktop-only">day streak</span>
            </span>
            <span className="wallet-pill">
              <Icon name="coins" size={18} />
              <strong>{state.coins}</strong>
              <span className="desktop-only">coins</span>
            </span>
            <ThemeButton />
            <LinkToSettings />
            <button className="avatar topbar-avatar" onClick={onHelp} aria-label="Open field guide">
              {state.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        {error && !pendingAction && (
          <div className="sync-banner" role="alert">
            <Icon name="cloud" size={18} />
            <span>{error}</span>
            <button onClick={restore} disabled={busy}>
              {busy ? 'Syncing…' : 'Reconnect'}
            </button>
          </div>
        )}
        <main id="main-content" className="main-content" key={location.pathname}>
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {destinations.map((d) => (
          <NavLink
            key={d.path}
            className={({ isActive }) => (isActive ? 'active' : '')}
            to={d.path}
          >
            <Icon name={d.icon} size={21} />
            <span>{d.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
function LinkToSettings() {
  return (
    <NavLink className="icon-button mobile-settings" to="/settings" aria-label="Open settings">
      <Icon name="settings" size={19} />
    </NavLink>
  );
}
function Adventure() {
  const game = useGameState();
  const [editor, setEditor] = useState(null),
    [help, setHelp] = useState(false);
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = game.state?.settings.theme || 'system';
      const active = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = active;
      document.documentElement.dataset.motion =
        game.state?.settings.motion === false ? 'off' : 'on';
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', active === 'dark' ? '#20192d' : '#f7f3fc');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [game.state?.settings.theme, game.state?.settings.motion]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setEditor(null);
  }, [location.pathname]);
  useEffect(() => {
    document.title = `${destinations.find((d) => d.path === location.pathname)?.label || (location.pathname === '/settings' ? 'Settings' : 'Small steps, big adventures')} · Pocket Quest`;
  }, [location.pathname]);
  const context = {
    ...game,
    editQuest: (task) => setEditor({ task }),
    addQuest: () => setEditor({ task: null }),
    openHelp: () => setHelp(true),
  };
  if (!game.ready)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-sprout">
          <Icon name="sprout" size={36} />
        </span>
        <p>Opening your little world…</p>
      </div>
    );
  if (game.error && !game.state)
    return (
      <GameContext.Provider value={context}>
        <div className="connection-screen">
          <Brand />
          <h1>Let’s reconnect.</h1>
          <p>{game.error}</p>
          <div className="button-row">
            <button className="button primary" onClick={game.restore}>
              Try again
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await game.signOut();
                  game.startGuest('cat');
                  navigate('/dashboard');
                } catch (e) {
                  game.toast(e.message, 'error');
                }
              }}
            >
              Continue as guest
            </button>
          </div>
        </div>
      </GameContext.Provider>
    );
  const protectedPage = (component) =>
    game.state ? (
      <Shell onAdd={context.addQuest} onHelp={context.openHelp}>
        {component}
      </Shell>
    ) : (
      <Navigate to="/" replace />
    );
  return (
    <GameContext.Provider value={context}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={game.state ? <Navigate to="/dashboard" replace /> : <Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Account />} />
        <Route path="/forgot-password" element={<Account recovery />} />
        <Route path="/reset-password" element={<Account reset />} />
        <Route path="/dashboard" element={protectedPage(<Today />)} />
        <Route path="/quests" element={protectedPage(<Quests />)} />
        <Route path="/habitat" element={protectedPage(<Habitat />)} />
        <Route path="/market" element={protectedPage(<Market />)} />
        <Route path="/journey" element={protectedPage(<Journey />)} />
        <Route path="/settings" element={protectedPage(<Preferences />)} />
        <Route path="/pet-room" element={<Navigate to="/habitat" replace />} />
        <Route path="/onboarding" element={<Navigate to="/welcome" replace />} />
        <Route path="/objectives/new" element={<Navigate to="/quests?new=1" replace />} />
        <Route
          path="*"
          element={
            <div className="connection-screen">
              <Brand />
              <span className="pixel-label">A LITTLE OFF THE PATH</span>
              <h1>This trail ends here.</h1>
              <p>Let’s head back to your adventure.</p>
              <button
                className="button primary"
                onClick={() => navigate(game.state ? '/dashboard' : '/')}
              >
                Back home <Icon name="arrow" />
              </button>
            </div>
          }
        />
      </Routes>
      {editor && <QuestEditor task={editor.task} onClose={() => setEditor(null)} />}
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      {game.notice && (
        <div className={`toast ${game.notice.kind}`} role="status" key={game.notice.id}>
          <Icon name={game.notice.kind === 'error' ? 'help' : 'sparkles'} />
          <span>{game.notice.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={game.dismissNotice}
          >
            <Icon name="x" size={17} />
          </button>
        </div>
      )}
    </GameContext.Provider>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Adventure />
    </BrowserRouter>
  );
}
