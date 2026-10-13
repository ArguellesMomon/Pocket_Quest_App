import { useEffect, useId, useRef, useState } from 'react';
import { SELECTABLE_COMPANIONS, companionFor } from '../../shared/companions.js';
import Icon from './Icon';
import SpritePet from './SpritePet';

export default function ChatCharacterPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef(null),
    trigger = useRef(null),
    options = useRef([]);
  const selected = SELECTABLE_COMPANIONS.findIndex((pet) => pet.id === value);
  const companion = companionFor(value);
  useEffect(() => {
    if (!open) return;
    options.current[selected]?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, selected]);
  function choose(character) {
    onChange(character);
    setOpen(false);
    trigger.current?.focus();
  }
  function keyboard(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const current = options.current.indexOf(document.activeElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? SELECTABLE_COMPANIONS.length - 1
          : (Math.max(0, current) +
              (event.key === 'ArrowDown' ? 1 : -1) +
              SELECTABLE_COMPANIONS.length) %
            SELECTABLE_COMPANIONS.length;
    options.current[next]?.focus();
  }
  return (
    <div
      className="chat-character-picker"
      ref={root}
      onKeyDown={keyboard}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="chat-character-trigger"
        ref={trigger}
        aria-label="Your chat companion"
        aria-haspopup="listbox"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <SpritePet species={value} mood="curious" />
        <span>{companion.name}</span>
        <Icon name="down" size={16} />
      </button>
      {open && (
        <div id={id} className="chat-character-menu" role="listbox" aria-label="Chat companions">
          {SELECTABLE_COMPANIONS.map((pet, index) => (
            <button
              type="button"
              role="option"
              aria-label={pet.name}
              aria-selected={pet.id === value}
              tabIndex={-1}
              key={pet.id}
              ref={(element) => {
                options.current[index] = element;
              }}
              onClick={() => choose(pet.id)}
            >
              <SpritePet species={pet.id} mood="idle" animate={false} />
              <span>{pet.name}</span>
              {pet.id === value && <Icon name="check" size={17} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
