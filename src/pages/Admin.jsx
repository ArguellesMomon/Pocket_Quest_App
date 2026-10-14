import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context';
import { accountRequest } from '../lib/cloud';
import { levelFor, petStats } from '../../shared/game';
import { SELECTABLE_COMPANIONS, MOODS, moodFor } from '../../shared/companions';
import { ScreenHeading } from '../components/PhoneUI';
import SpritePet from '../components/SpritePet';
import Icon from '../components/Icon';
import '../styles/admin.css';

function fields(state) {
  return { coins: state.coins, xp: state.xp, species: state.pet.species, ...petStats(state) };
}
export default function Admin() {
  const game = useGame();
  const [record, setRecord] = useState(null),
    [values, setValues] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  const retry = useRef(null),
    active = useRef(true),
    loadFlight = useRef(0);
  async function load() {
    const generation = ++loadFlight.current;
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const result = await accountRequest('/api/admin', {}, game.user?.id);
      if (!active.current || generation !== loadFlight.current) return;
      setRecord(result);
      setValues(fields(result.state));
      retry.current = null;
    } catch (e) {
      if (active.current && generation === loadFlight.current) setError(e.message);
    } finally {
      if (active.current && generation === loadFlight.current) setLoading(false);
    }
  }
  useEffect(() => {
    active.current = true;
    if (game.user) load();
    else setLoading(false);
    return () => {
      active.current = false;
      loadFlight.current++;
    };
  }, [game.user?.id]);
  const change = (patch) => {
    setValues((current) => ({ ...current, ...patch }));
    setSaved(false);
  };
  const locked = loading || saving || game.pendingAction;
  const preview =
    record && values
      ? {
          ...record.state,
          xp: Number(values.xp) || 0,
          pet: {
            ...record.state.pet,
            species: values.species,
            energy: Number(values.energy),
            joy: Number(values.joy),
            lastInteraction: null,
            updatedAt: Date.now(),
          },
        }
      : null;
  return (
    <div className="admin-screen">
      <ScreenHeading title="Test controls" subtitle="Only changes this account's adventure.">
        <Link className="icon-button" to="/dashboard" aria-label="Back to Today">
          <Icon name="back" />
        </Link>
      </ScreenHeading>
      {!game.user ? (
        <div className="panel admin-panel">
          <p>Sign in with your test admin account.</p>
          <Link className="button primary" to="/login">
            Sign in
          </Link>
        </div>
      ) : (
        <div className="panel admin-panel">
          {loading && <p role="status">Loading test values…</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!record && !loading && (
            <button className="button secondary" onClick={load}>
              Try again
            </button>
          )}
          {preview && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (locked) return;
                setSaving(true);
                setError('');
                setSaved(false);
                const request = retry.current || {
                  id: crypto.randomUUID(),
                  version: record.version,
                  values: {
                    ...values,
                    coins: Number(values.coins),
                    xp: Number(values.xp),
                    energy: Number(values.energy),
                    joy: Number(values.joy),
                  },
                };
                retry.current = request;
                try {
                  const result = await game.updateTestProgress(request);
                  retry.current = null;
                  if (active.current) {
                    setRecord(result);
                    setValues(fields(result.state));
                    setSaved(true);
                  }
                } catch (e) {
                  if (e.status && e.status < 500) retry.current = null;
                  if (active.current) setError(e.message);
                } finally {
                  if (active.current) setSaving(false);
                }
              }}
            >
              <fieldset disabled={locked || Boolean(retry.current)}>
                <div className="admin-preview">
                  <SpritePet species={values.species} mood={moodFor(preview, petStats(preview))} />
                  <div>
                    <strong>
                      {SELECTABLE_COMPANIONS.find((pet) => pet.id === values.species)?.name ||
                        preview.pet.name}
                    </strong>
                    <small>
                      Level {levelFor(preview.xp)} ·{' '}
                      {MOODS[moodFor(preview, petStats(preview))].label}
                    </small>
                  </div>
                  <span className="admin-badge">ADMIN</span>
                </div>
                <div className="admin-currency">
                  <label>
                    Coins
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="1000000"
                      step="1"
                      required
                      value={values.coins}
                      onChange={(e) => change({ coins: e.target.value })}
                    />
                  </label>
                  <label>
                    Points / XP
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="150000"
                      step="1"
                      required
                      value={values.xp}
                      onChange={(e) => change({ xp: e.target.value })}
                    />
                  </label>
                </div>
                <div className="admin-presets">
                  <button
                    type="button"
                    onClick={() =>
                      change({
                        coins:
                          Number(values.coins) + 1000 > 1000000
                            ? 1000000
                            : Number(values.coins) + 1000,
                      })
                    }
                  >
                    +1,000 coins
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      change({ xp: Math.min(150000, levelFor(Number(values.xp)) * 150) })
                    }
                  >
                    Next level
                  </button>
                </div>
                <label>
                  Companion
                  <select
                    value={values.species}
                    onChange={(e) => change({ species: e.target.value })}
                  >
                    {SELECTABLE_COMPANIONS.map((pet) => (
                      <option value={pet.id} key={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  { key: 'energy', name: 'Energy' },
                  { key: 'joy', name: 'Happiness' },
                ].map(({ key, name }) => (
                  <label className="admin-meter" key={key} htmlFor={`admin-${key}`}>
                    {name}
                    <output htmlFor={`admin-${key}`}>{values[key]}%</output>
                    <input
                      id={`admin-${key}`}
                      type="range"
                      min="20"
                      max="100"
                      value={values[key]}
                      onChange={(e) => change({ [key]: Number(e.target.value) })}
                    />
                  </label>
                ))}
                <div className="admin-presets">
                  {[
                    { name: 'Happy', energy: 100, joy: 100 },
                    { name: 'Hungry', energy: 45, joy: 70 },
                    { name: 'Sleepy', energy: 20, joy: 70 },
                    { name: 'Lonely', energy: 70, joy: 20 },
                  ].map(({ name, ...stats }) => (
                    <button key={name} type="button" onClick={() => change(stats)}>
                      {name}
                    </button>
                  ))}
                </div>
              </fieldset>
              {game.pendingAction && (
                <p role="status" className="admin-note">
                  Waiting for your adventure to finish saving…
                </p>
              )}
              {saved && (
                <p className="admin-saved" role="status">
                  <Icon name="check" size={15} /> Test progress saved.
                </p>
              )}
              <div className="admin-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={locked || Boolean(retry.current)}
                  onClick={load}
                >
                  Reload
                </button>
                <button className="button primary" disabled={locked}>
                  {saving ? 'Saving…' : retry.current ? 'Retry save' : 'Save test values'}
                </button>
              </div>
              <small className="admin-note">
                Values save to this test account. Pet stats use the game's 20–100% range.
              </small>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
