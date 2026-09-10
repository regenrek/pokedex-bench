import { useCallback, useRef } from 'react';
import { Hinge } from './hardware/Hinge';
import { LeftHalf } from './LeftHalf';
import { RightHalf } from './RightHalf';
import { useKeyboardControls } from '../hooks/useKeyboardControls';

/** Assembles the two casing halves around the hinge and wires global controls. */
export function Pokedex() {
  const searchInput = useRef<HTMLInputElement | null>(null);

  const focusSearch = useCallback(() => {
    searchInput.current?.focus();
    searchInput.current?.select();
  }, []);

  useKeyboardControls({ onFocusSearch: focusSearch });

  return (
    <>
      <div className="pokedex" role="group" aria-label="Kanto Pokédex — Monster Index model MA-01">
        <LeftHalf inputRef={searchInput} />
        <Hinge />
        <RightHalf />
      </div>
      <p className="app__hints">
        <span>
          <kbd>←</kbd> <kbd>→</kbd> browse entries
        </span>
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> change screen
        </span>
        <span>
          <kbd>/</kbd> search
        </span>
        <span>
          <kbd>0</kbd>–<kbd>9</kbd> jump to number
        </span>
      </p>
    </>
  );
}
