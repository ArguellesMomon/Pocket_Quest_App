import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context';
import { createGame } from '../../shared/game';
import { Brand } from '../Application';
import { HabitatArt } from './PixelArt';
import { CompanionPicker } from './PhoneUI';
import Icon from './Icon';
export default function WelcomeStart() {
  const { state, user, startGuest } = useGame();
  const [species, setSpecies] = useState('cat');
  const navigate = useNavigate();
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <Brand />
        <Link className="button secondary" to={state ? '/dashboard' : '/login'}>
          {state ? 'Open' : 'Sign in'}
          <Icon name="arrow" size={16} />
        </Link>
      </header>
      <main id="main-content" className="welcome-main">
        <div className="welcome-heading">
          <h1>Your pocket world.</h1>
          <p>Do quests. Grow together.</p>
        </div>
        <div className="welcome-scene">
          <HabitatArt state={createGame(species)} mood="happy" />
        </div>
        <div className="welcome-choose">
          <h2>Choose a friend</h2>
          <CompanionPicker value={species} onChange={setSpecies} preview />
        </div>
        <button
          className="button primary welcome-start"
          onClick={() => {
            if (!user) startGuest(species);
            navigate('/dashboard');
          }}
        >
          {state ? 'Continue' : 'Let’s play'}
          <Icon name="arrow" size={18} />
        </button>
        <span className="welcome-note">
          <Icon name="cloud" size={14} />
          Guest progress saves on this device.
        </span>
      </main>
    </div>
  );
}
