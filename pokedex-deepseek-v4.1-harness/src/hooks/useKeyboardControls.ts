import { useEffect, useRef } from 'react';
import { usePokedex } from '../state/pokedexContext';

export interface KeyboardControlOptions {
  /** Moves focus to the on-LCD search field. */
  onFocusSearch(): void;
}

/**
 * Global hardware shortcuts, mirroring the physical controls:
 * ← → step entries, ↑ ↓ change screens, digits type a dex number,
 * Enter opens it, `/` focuses search, Esc clears.
 */
export function useKeyboardControls({ onFocusSearch }: KeyboardControlOptions): void {
  const dex = usePokedex();
  const latest = useRef(dex);
  const focusSearch = useRef(onFocusSearch);

  useEffect(() => {
    latest.current = dex;
    focusSearch.current = onFocusSearch;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const controller = latest.current;
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (event.key === 'Escape') {
        controller.clearKeypad();
        if (isTyping) target?.blur();
        return;
      }

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          controller.previous();
          return;
        case 'ArrowRight':
          event.preventDefault();
          controller.next();
          return;
        case 'ArrowUp':
          event.preventDefault();
          controller.cycleView(-1);
          return;
        case 'ArrowDown':
          event.preventDefault();
          controller.cycleView(1);
          return;
        case 'Enter':
          event.preventDefault();
          if (controller.state.keypadBuffer.length > 0) controller.confirmKeypad();
          else if (controller.state.view === 'index') controller.submitSearch();
          return;
        case 'Backspace':
          event.preventDefault();
          controller.clearKeypad();
          return;
        case '/':
          event.preventDefault();
          focusSearch.current();
          return;
        default:
          break;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        controller.pressDigit(event.key);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
