import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context';
import { petStats } from '../../shared/game';
import { companionFor, frameFor, moodFor, MOODS } from '../../shared/companions';
export default function SpritePet({ species = 'cat', mood, className = '', label }) {
  const game = useGame(),
    companion = companionFor(species),
    ref = useRef(null);
  const [visible, setVisible] = useState(true),
    [reduced, setReduced] = useState(false),
    [elapsed, setElapsed] = useState(0);
  const resolvedMood =
    mood || (game?.state ? moodFor(game.state, petStats(game.state, game.now), game.now) : 'idle');
  const moving = !reduced && game?.state?.settings.motion !== false && visible;
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries[0]?.isIntersecting && !document.hidden),
    );
    if (ref.current) observer.observe(ref.current);
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      query.removeEventListener('change', apply);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    setElapsed(0);
    if (!moving) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [moving, resolvedMood, species]);
  const frame = frameFor(companion, resolvedMood, elapsed, moving);
  return (
    <span
      ref={ref}
      className={`sprite-pet ${className} mood-${resolvedMood}`}
      role="img"
      aria-label={`${label || companion.name}, ${MOODS[resolvedMood]?.label || 'Cozy'}`}
      data-mood={resolvedMood}
      data-frame={`${frame.row}-${frame.column}`}
      style={{
        '--sprite-aspect': companion.id === 'samo' ? '192 / 208' : '1',
        backgroundImage: `url('/companions/${frame.sheet || companion.sheet || 'mochi.webp'}')`,
        backgroundSize: `${(frame.columns || companion.columns || 4) * 100}% ${(frame.rows || companion.rows || 6) * 100}%`,
        backgroundPosition: `${(frame.column / ((frame.columns || companion.columns || 4) - 1)) * 100}% ${(frame.row / ((frame.rows || companion.rows || 6) - 1)) * 100}%`,
      }}
    />
  );
}
