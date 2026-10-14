import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context';
import Icon from './Icon';

export default function ProfileMenu() {
  const { state, user, busy, pendingAction, signOut, toast, admin } = useGame();
  const [open, setOpen] = useState(false),
    [leaving, setLeaving] = useState(false);
  const root = useRef(null),
    button = useRef(null),
    items = useRef(null);
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function keyboard(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      requestAnimationFrame(() => items.current?.querySelector('[role="menuitem"]')?.focus());
      return;
    }
    const options = [...items.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const current = options.indexOf(document.activeElement);
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[index]?.focus();
  }
  return (
    <div
      className="profile-menu"
      ref={root}
      onKeyDown={keyboard}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        className="avatar topbar-avatar"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {state.name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div ref={items} className="profile-menu-panel" role="menu" aria-label="Account actions">
          <div className="profile-menu-name">
            <strong>{state.name}</strong>
            <small>{user ? 'Signed in' : 'Guest adventure'}</small>
          </div>
          <Link role="menuitem" to="/settings?tab=profile" onClick={() => setOpen(false)}>
            <Icon name="settings" size={17} />
            Profile & settings
          </Link>
          {admin && (
            <Link role="menuitem" to="/admin" onClick={() => setOpen(false)}>
              <Icon name="filter" size={17} />
              Test controls
            </Link>
          )}
          {user ? (
            <button
              role="menuitem"
              disabled={leaving || busy || pendingAction}
              onClick={async () => {
                setLeaving(true);
                try {
                  await signOut();
                  setOpen(false);
                  navigate('/');
                } catch (error) {
                  toast(error.message, 'error');
                } finally {
                  setLeaving(false);
                }
              }}
            >
              <Icon name="logout" size={17} />
              {leaving ? 'Signing out…' : pendingAction ? 'Saving progress…' : 'Sign out'}
            </button>
          ) : (
            <Link role="menuitem" to="/login" onClick={() => setOpen(false)}>
              <Icon name="login" size={17} />
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
