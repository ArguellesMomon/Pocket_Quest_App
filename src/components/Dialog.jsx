import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';
export default function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  headerContent,
}) {
  const ref = useRef(),
    id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="dialog-head">
        <div>
          <h2 id={id} className={headerContent ? 'sr-only' : undefined}>
            {title}
          </h2>
          {headerContent}
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <Icon name="x" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
