import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PokeApiError,
  fetchPokemonBundle,
  fetchPokemonIndex,
  GEN1_COUNT,
} from '../api/pokeapi';
import { toDexEntry, type DexEntry } from '../lib/entry';
import type { IndexEntry } from '../lib/search';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface IndexState {
  status: LoadStatus;
  entries: IndexEntry[];
  error: string | null;
  reload: () => void;
}

/** Loads the Generation I index once and caches it in module state + storage. */
export function usePokedexIndex(): IndexState {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [entries, setEntries] = useState<IndexEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus((current) => (current === 'ready' ? current : 'loading'));

    fetchPokemonIndex()
      .then((payload) => {
        if (!active) return;
        const mapped = payload.results
          .map((item, index) => {
            const match = /\/(\d+)\/?$/.exec(item.url);
            const id = match ? Number.parseInt(match[1]!, 10) : index + 1;
            return { id, name: item.name };
          })
          .filter((entry) => Number.isFinite(entry.id))
          .slice(0, GEN1_COUNT);
        setEntries(mapped);
        setError(null);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof PokeApiError
            ? cause.shortMessage
            : 'INDEX UNAVAILABLE — PRESS RETRY',
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return useMemo(
    () => ({ status, entries, error, reload }),
    [status, entries, error, reload],
  );
}

export interface EntryState {
  status: LoadStatus;
  entry: DexEntry | null;
  error: string | null;
  /** True while a *new* Pokémon is loading and stale content is still shown. */
  isNavigating: boolean;
  retry: () => void;
}

/**
 * Lazily loads one Pokémon + species pair.
 *
 * Stale-while-revalidate: while a new record is fetched the previous entry
 * stays on screen so the device never blanks out during navigation.
 */
export function usePokedexEntry(id: number): EntryState {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [entry, setEntry] = useState<DexEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const ticket = ++requestId.current;
    setStatus('loading');
    setError(null);

    fetchPokemonBundle(id)
      .then((bundle) => {
        if (ticket !== requestId.current) return;
        setEntry(toDexEntry(bundle));
        setError(null);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (ticket !== requestId.current) return;
        setError(
          cause instanceof PokeApiError
            ? cause.shortMessage
            : 'LINK FAILURE — PRESS CONFIRM TO RETRY',
        );
        setStatus('error');
      });
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const isNavigating = status === 'loading' && entry !== null;

  return useMemo(
    () => ({ status, entry, error, isNavigating, retry }),
    [status, entry, error, isNavigating, retry],
  );
}

/** Tracks `prefers-reduced-motion` so animations can be switched off. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return reduced;
}
