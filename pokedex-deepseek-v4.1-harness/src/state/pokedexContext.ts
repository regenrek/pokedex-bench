import { createContext, useContext } from 'react';
import type { PokedexState, ViewId } from './pokedexReducer';
import type { SearchOutcome } from '../domain/search';

export interface PokedexController {
  state: PokedexState;
  isBooting: boolean;
  isRefreshing: boolean;
  statusLine: string;
  keypadPreview: string;
  /** Set when the last search could not be resolved. */
  searchOutcome: SearchOutcome | null;
  /** `true` for one second after any successful network round-trip. */
  linkActive: boolean;

  select(id: number): void;
  next(): void;
  previous(): void;
  setView(view: ViewId): void;
  cycleView(delta: number): void;
  setQuery(value: string): void;
  submitSearch(): void;
  pressDigit(digit: string): void;
  clearKeypad(): void;
  confirmKeypad(): void;
  retry(): void;
}

export const PokedexContext = createContext<PokedexController | null>(null);

/** Access the device controller. Throws when used outside the provider. */
export function usePokedex(): PokedexController {
  const controller = useContext(PokedexContext);
  if (!controller) throw new Error('usePokedex must be used inside <PokedexProvider>');
  return controller;
}
