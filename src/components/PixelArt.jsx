import { Link } from 'react-router-dom';
import SpritePet from './SpritePet';
import Icon from './Icon';

export const BACKGROUNDS = {
  daydream: 'Dream garden',
  sunset: 'Peach beach',
  cloud: 'Cloud nine',
  night: 'Starlight clearing',
};
export function PixelPet(props) {
  return ['fox', 'bunny'].includes(props.species) ? (
    <LegacyPixelPet {...props} />
  ) : (
    <SpritePet {...props} />
  );
}
export function LegacyPixelPet({ species, className = '', label = 'Pixel companion' }) {
  const color = species === 'fox' ? '#e89457' : '#eee4e9';
  return (
    <svg
      className={`pixel-pet ${className}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <path
        d={
          species === 'bunny' ? 'M16 4h8v24h-8zM40 4h8v24h-8z' : 'M12 14h12v18H12zM40 14h12v18H40z'
        }
        fill={color}
        stroke="#67546e"
        strokeWidth="3"
      />
      <path
        d="M16 24h32v8h8v16h-8v12H16V48H8V32h8z"
        fill={color}
        stroke="#67546e"
        strokeWidth="3"
      />
      <path d="M18 48h28v12H18z" fill="#fff1df" />
      <g fill="#544658">
        <rect x="20" y="34" width="4" height="6" />
        <rect x="40" y="34" width="4" height="6" />
      </g>
      <path d="M29 42h6v4h-6z" fill="#b07b75" />
      <g className="pet-eyelids" fill={color}>
        <rect x="20" y="34" width="4" height="6" />
        <rect x="40" y="34" width="4" height="6" />
      </g>
    </svg>
  );
}
export function HabitatArt({ state, onPet, compact = false, celebrating = false, mood }) {
  const background = BACKGROUNDS[state?.equipped.background]
    ? state.equipped.background
    : 'daydream';
  return (
    <div
      className={`habitat-art ${compact ? 'compact' : ''} ${celebrating ? 'celebrating' : ''}`}
      data-background={background}
    >
      <img
        key={background}
        className="scene-background"
        src={`/backgrounds/${background}.webp`}
        alt={BACKGROUNDS[background]}
      />
      {state?.equipped.habitat === 'mushroom' && (
        <span className="scene-cottage">
          <ItemArt type="mushroom" />
        </span>
      )}
      {state?.equipped.decor.includes('plant') && (
        <span className="scene-decor scene-plant">
          <ItemArt type="plant" />
        </span>
      )}
      {state?.equipped.decor.includes('lamp') && (
        <span className="scene-decor scene-lamp">
          <ItemArt type="lamp" />
        </span>
      )}
      <button
        className="scene-companion"
        onClick={onPet}
        disabled={!onPet}
        aria-label={`Say hello to ${state?.pet.name || 'Mochi'}`}
      >
        <PixelPet
          species={state?.pet.species}
          mood={mood || (celebrating ? 'playful' : undefined)}
          label={state?.pet.name || 'Mochi'}
        />
      </button>
      {onPet && (
        <Link
          className="background-shortcut"
          to="/market?tab=backgrounds"
          aria-label="Change background"
        >
          <Icon name="scene" size={13} /> Scene
        </Link>
      )}
      <span className="scene-spark spark-one" aria-hidden="true">
        ✦
      </span>
      <span className="scene-spark spark-two" aria-hidden="true">
        ✧
      </span>
    </div>
  );
}
const RASTER_ITEMS = ['berry', 'tea', 'ball', 'book', 'plant', 'lamp'];
export function ItemArt({ type, className = '' }) {
  if (BACKGROUNDS[type])
    return (
      <img
        className={`item-art background-art ${className}`}
        src={`/backgrounds/${type}.webp`}
        alt={BACKGROUNDS[type]}
      />
    );
  if (RASTER_ITEMS.includes(type))
    return (
      <img className={`item-art collectible-art ${className}`} src={`/items/${type}.webp`} alt="" />
    );
  return (
    <svg
      className={`item-art cottage-art ${className}`}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Mushroom cottage"
    >
      <ellipse cx="48" cy="86" rx="32" ry="5" fill="#665080" opacity=".12" />
      <path d="M25 42h47v39q-23 10-47 0z" fill="#ffeac8" stroke="#715775" strokeWidth="3" />
      <path
        d="M13 44C12 24 28 11 48 10c21 0 37 14 37 34Q48 53 13 44Z"
        fill="#ee8f9d"
        stroke="#715775"
        strokeWidth="3"
      />
      <path
        d="M23 33c4-11 11-15 22-17"
        fill="none"
        stroke="#ffd3c8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="31" cy="36" rx="7" ry="5" fill="#fff6df" />
      <ellipse cx="62" cy="27" rx="6" ry="5" fill="#fff6df" />
      <path d="M46 83V65a9 9 0 0 1 18 0v18" fill="#aa81be" stroke="#715775" strokeWidth="3" />
      <rect
        x="30"
        y="58"
        width="10"
        height="11"
        rx="3"
        fill="#a9c9f3"
        stroke="#715775"
        strokeWidth="2"
      />
      <circle cx="59" cy="71" r="2" fill="#ffdf9a" />
      <path d="M20 84h57" stroke="#715775" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
