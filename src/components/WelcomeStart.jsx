import { Link } from 'react-router-dom';
import { useGame } from '../context';
import { createGame } from '../../shared/game';
import { Brand } from '../Application';
import { HabitatArt } from './PixelArt';
import SpritePet from './SpritePet';
import Icon from './Icon';
export default function WelcomeStart() {
  const { user, state } = useGame();
  const signedIn = Boolean(user && state);
  return (
    <div className="welcome-page fresh-welcome">
      <header className="welcome-header">
        <Brand />
        <Link className="welcome-signin" to={signedIn ? '/dashboard' : '/login'}>
          {signedIn ? 'My day' : 'Sign in'}
          <Icon name="arrow" size={16} />
        </Link>
      </header>
      <main id="main-content" className="welcome-main">
        <div className="welcome-visual">
          <div className="welcome-scene">
            <HabitatArt state={createGame('samo')} mood="happy" />
          </div>
          <div className="welcome-reward">
            <Icon name="sparkles" size={16} /> Little wins add up
          </div>
          <div className="welcome-task-preview" aria-hidden="true">
            <span className="preview-check">
              <Icon name="check" size={16} />
            </span>
            <div>
              <strong>One thing at a time</strong>
              <small>A calmer kind of to-do list</small>
            </div>
            <span className="preview-coins">
              <Icon name="coins" size={14} /> +20
            </span>
          </div>
        </div>
        <div className="welcome-heading">
          <span className="welcome-kicker">
            <Icon name="sprout" size={15} /> Make room for little wins
          </span>
          <h1>
            Small tasks.
            <br />
            <span>Big little wins.</span>
          </h1>
          <p>Your to-do list, with a friend.</p>
        </div>
        <div className="welcome-loop" aria-label="How Pocket Quest works">
          {[
            { icon: 'tasks', text: 'Plan' },
            { icon: 'done', text: 'Finish' },
            { icon: 'paw', text: 'Grow' },
          ].map(({ icon, text }) => (
            <span key={text}>
              <Icon name={icon} size={17} />
              {text}
            </span>
          ))}
        </div>
        <div className="welcome-cta">
          <Link
            className="button primary welcome-start"
            to={signedIn ? '/dashboard' : '/login?mode=signup'}
          >
            {signedIn ? 'Open my day' : 'Get started'}
            <Icon name="arrow" size={18} />
          </Link>
          <div className="welcome-friends" aria-hidden="true">
            <SpritePet species="cat" mood="happy" />
            <SpritePet species="chami" mood="happy" />
            <SpritePet species="pip" mood="happy" />
            <span>
              A little friend.
              <br />A little motivation.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
