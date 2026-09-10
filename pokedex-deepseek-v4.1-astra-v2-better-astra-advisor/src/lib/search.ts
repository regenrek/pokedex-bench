/**
 * Query resolution for the search slot and the numeric keypad.
 *
 * Accepted forms: `pikachu`, `Pikachu`, `PIKACHU`, `25`, `025`, `#25`.
 * Numbers outside #001–#151 and unknown names produce a typed error result so
 * the device can render a useful state instead of failing silently.
 */
import { FIRST_ID, LAST_ID } from '../api/pokeapi';
import { displayName } from './format';

export interface IndexEntry {
  id: number;
  name: string;
}

export type SearchResult =
  | { kind: 'match'; id: number; name: string }
  | { kind: 'empty' }
  | { kind: 'range'; id: number; message: string }
  | { kind: 'unknown'; message: string };

const NUMERIC_PATTERN = /^#?\s*0*(\d{1,4})$/;

export function resolveQuery(query: string, index: readonly IndexEntry[]): SearchResult {
  const raw = query.trim();
  if (!raw) return { kind: 'empty' };

  const numeric = NUMERIC_PATTERN.exec(raw);
  if (numeric) {
    const id = Number.parseInt(numeric[1] ?? '', 10);
    if (!Number.isFinite(id)) {
      return { kind: 'unknown', message: 'ENTER A NAME OR POKÉDEX NUMBER' };
    }
    if (id < FIRST_ID) {
      return {
        kind: 'range',
        id,
        message: `No. ${String(id).padStart(3, '0')} IS BELOW THIS INDEX`,
      };
    }
    if (id > LAST_ID) {
      return {
        kind: 'range',
        id,
        message: `No. ${String(id).padStart(3, '0')} IS BEYOND KANTO — INDEX ENDS AT 151`,
      };
    }
    const known = index.find((entry) => entry.id === id);
    return { kind: 'match', id, name: known?.name ?? `pokemon-${id}` };
  }

  const normalised = raw.toLowerCase().replace(/[.\s_]+/g, '-').replace(/^#/, '');
  const exact = index.find((entry) => entry.name === normalised);
  if (exact) return { kind: 'match', id: exact.id, name: exact.name };

  const partial = index.filter((entry) => entry.name.startsWith(normalised));
  if (partial.length === 1) {
    const only = partial[0]!;
    return { kind: 'match', id: only.id, name: only.name };
  }
  if (partial.length > 1) {
    const list = partial
      .slice(0, 3)
      .map((entry) => displayName(entry.name))
      .join(', ');
    return {
      kind: 'unknown',
      message: `"${raw.toUpperCase()}" MATCHES ${partial.length} ENTRIES — ${list.toUpperCase()}…`,
    };
  }

  return {
    kind: 'unknown',
    message: `"${raw.toUpperCase()}" IS NOT IN THIS INDEX`,
  };
}

/** Boundary-safe step used by every navigation control. */
export function clampId(id: number): number {
  if (!Number.isFinite(id)) return FIRST_ID;
  return Math.min(LAST_ID, Math.max(FIRST_ID, Math.trunc(id)));
}

export function stepId(id: number, delta: number): number {
  return clampId(id + delta);
}

export function isBoundary(id: number, delta: number): boolean {
  return stepId(id, delta) === id;
}
