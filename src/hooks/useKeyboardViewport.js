import { useEffect } from 'react';

const TEXT_INPUTS = 'input:not([type="checkbox"]):not([type="radio"]), textarea, select';

export function useKeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const editing = document.activeElement?.matches?.(TEXT_INPUTS);
        const keyboardOpen =
          window.innerWidth <= 760 &&
          editing &&
          viewport.scale <= 1.05 &&
          viewport.height < window.innerHeight - 100;

        if (keyboardOpen) {
          root.dataset.keyboardOpen = 'true';
          root.style.setProperty('--keyboard-height', `${viewport.height}px`);
          root.style.setProperty('--keyboard-top', `${viewport.offsetTop}px`);
        } else {
          delete root.dataset.keyboardOpen;
          root.style.removeProperty('--keyboard-height');
          root.style.removeProperty('--keyboard-top');
        }
      });
    };

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      delete root.dataset.keyboardOpen;
      root.style.removeProperty('--keyboard-height');
      root.style.removeProperty('--keyboard-top');
    };
  }, []);
}
