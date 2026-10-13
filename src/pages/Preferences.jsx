import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context';
import { ScreenHeading, Segments } from '../components/PhoneUI';
import Icon from '../components/Icon';
import Dialog from '../components/Dialog';
export default function Preferences() {
  const { state, user, act, busy, pendingAction, signOut, toast, openHelp, retry, syncing } =
    useGame();
  const [tab, setTab] = useState('look'),
    [logout, setLogout] = useState(false),
    [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState({
    name: state.name,
    petName: state.pet.name,
    timezone: state.timezone,
  });
  const navigate = useNavigate();
  const preference = (key, value) =>
    act({ type: 'settings.update', settings: { ...state.settings, [key]: value } });
  const save = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { app: 'Pocket Quest', exportedAt: new Date().toISOString(), adventure: state },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pocket-quest.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Progress exported.');
  };
  return (
    <div className="compact-page settings-page">
      <ScreenHeading title="Settings">
        <button className="icon-button" aria-label="Field guide" onClick={openHelp}>
          <Icon name="help" />
        </button>
      </ScreenHeading>
      <Segments
        label="Settings category"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'look', name: 'Appearance', icon: 'sun' },
          { id: 'profile', name: 'Profile', icon: 'paw' },
          { id: 'account', name: 'Account', icon: 'cloud' },
        ]}
      />
      <div className="settings-content panel">
        {tab === 'look' ? (
          <>
            <h2>Theme</h2>
            <div className="theme-options">
              {['light', 'dark', 'system'].map((t) => (
                <button
                  className={state.settings.theme === t ? 'selected' : ''}
                  key={t}
                  disabled={busy}
                  aria-pressed={state.settings.theme === t}
                  onClick={() => preference('theme', t)}
                >
                  <Icon name={t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'system'} />
                  <span>{t}</span>
                </button>
              ))}
            </div>
            {[
              { key: 'motion', name: 'Animations', icon: 'sparkles' },
              { key: 'sound', name: 'Sounds', icon: 'volume' },
            ].map((s) => (
              <div className="setting-row" key={s.key}>
                <strong>
                  <Icon name={s.icon} size={18} />
                  {s.name}
                </strong>
                <button
                  role="switch"
                  aria-label={s.name}
                  aria-checked={state.settings[s.key]}
                  className={`toggle ${state.settings[s.key] ? 'on' : ''}`}
                  disabled={busy}
                  onClick={() => preference(s.key, !state.settings[s.key])}
                >
                  <span />
                </button>
              </div>
            ))}
            <div className="setting-row">
              <strong>
                <Icon name="target" size={18} />
                Daily goal
              </strong>
              <select
                aria-label="Daily quest goal"
                value={state.settings.dailyGoal}
                disabled={busy}
                onChange={(e) => preference('dailyGoal', Number(e.target.value))}
              >
                {[1, 3, 5, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} quests
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : tab === 'profile' ? (
          <form
            className="profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await act({ type: 'profile.update', ...profile, species: state.pet.species });
            }}
          >
            <label>
              Your name
              <input
                value={profile.name}
                onChange={(e) => save('name', e.target.value)}
                maxLength={30}
                required
              />
            </label>
            <label>
              Companion name
              <input
                value={profile.petName}
                onChange={(e) => save('petName', e.target.value)}
                maxLength={20}
                required
              />
            </label>
            <label>
              Timezone
              <select value={profile.timezone} onChange={(e) => save('timezone', e.target.value)}>
                {[
                  ...new Set([
                    state.timezone,
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                    'Asia/Manila',
                    'Asia/Singapore',
                    'Asia/Tokyo',
                    'Europe/London',
                    'America/New_York',
                    'America/Los_Angeles',
                    'Australia/Sydney',
                    'UTC',
                  ]),
                ].map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </label>
            <button className="button primary full-width" disabled={busy}>
              Save changes
              <Icon name="check" size={17} />
            </button>
          </form>
        ) : (
          <div className="account-settings">
            <Icon name="cloud" size={35} />
            <h2>{user ? 'Cloud adventure' : 'Guest adventure'}</h2>
            <p>{user ? user.email : 'Saved on this device.'}</p>
            {user && (
              <div className="account-sync-status" role="status">
                <Icon name="cloud" size={15} />
                <span>{pendingAction ? 'Saving…' : 'Saved'}</span>
                {pendingAction && (
                  <button
                    className="icon-button"
                    disabled={syncing}
                    onClick={retry}
                    aria-label="Retry sync"
                  >
                    <Icon name="reset" size={15} />
                  </button>
                )}
              </div>
            )}
            {!user && (
              <Link className="button primary full-width" to="/login">
                Sign in
                <Icon name="arrow" size={17} />
              </Link>
            )}
            <button className="button secondary full-width" onClick={exportData}>
              <Icon name="download" size={17} />
              Export progress
            </button>
            {user && (
              <button className="button secondary full-width" onClick={() => setLogout(true)}>
                <Icon name="logout" size={17} />
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
      {logout && (
        <Dialog title="Sign out?" onClose={() => setLogout(false)}>
          <div className="dialog-body">
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setLogout(false)}>
                Cancel
              </button>
              <button
                className="button primary"
                disabled={signingOut || busy || pendingAction}
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    await signOut();
                    navigate('/');
                  } catch (e) {
                    toast(e.message, 'error');
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
