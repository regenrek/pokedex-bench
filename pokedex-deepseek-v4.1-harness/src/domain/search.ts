import { DEX_FIRST_ID, DEX_LAST_ID } from './pokemon';
import type { IndexEntry } from '../api/pokeapi';

export type SearchOutcome =
  | { status: 'empty' }
  | { status: 'match'; id: number; label: string; via: 'number' | 'name' }
  | { status: 'out-of-range'; id: number }
  | { status: 'no-match'; query: string };

/**
 * Resolves free-text Pokédex queries.
 *
 * Accepts `pikachu`, `Pikachu`, `PIKACHU`, `25`, `025`, `#25`, `mr mime`,
 * `Mr. Mime`, and partial prefixes (`pika`). Numeric queries are validated
 * against the 1–151 Kanto window so `152` reports out-of-range rather than
 * silently resolving to something else.
 */
export function resolveSearch(rawQuery: string, index: IndexEntry[]): SearchOutcome {
  const query = rawQuery.trim();
  if (query.length === 0) return { status: 'empty' };

  const numeric = /^#?\s*(\d{1,4})$/.exec(query);
  if (numeric) {
    const id = Number.parseInt(numeric[1], 10);
    if (id < DEX_FIRST_ID || id > DEX_LAST_ID) return { status: 'out-of-range', id };
    const entry = index.find((item) => item.id === id);
    return { status: 'match', id, label: entry?.displayName ?? `#${id}`, via: 'number' };
  }

  const normalized = normalizeName(query);
  if (normalized.length === 0) return { status: 'no-match', query };

  const exact = index.find(
    (entry) => normalizeName(entry.slug) === normalized || normalizeName(entry.displayName) === normalized,
  );
  if (exact) return { status: 'match', id: exact.id, label: exact.displayName, via: 'name' };

  const prefixMatches = index.filter((entry) => normalizeName(entry.displayName).startsWith(normalized));
  if (prefixMatches.length > 0) {
    const [first] = prefixMatches;
    return { status: 'match', id: first.id, label: first.displayName, via: 'name' };
  }

  return { status: 'no-match', query };
}

/** Case/punctuation-insensitive key: `"Mr. Mime"` and `"mr-mime"` both -> `mrmime`. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.'’:♀♂]/g, '')
    .replace(/[\s\-_]+/g, '');
}

/** Filters the index for the on-LCD list, preserving dex order. */
export function filterIndex(index: IndexEntry[], query: string): IndexEntry[] {
  const normalized = normalizeName(query);
  if (normalized.length === 0) return index;
  const numeric = /^#?\s*(\d{1,4})$/.exec(query.trim());
  if (numeric) {
    const id = Number.parseInt(numeric[1], 10);
    return index.filter((entry) => String(entry.id).padStart(3, '0').includes(String(id).padStart(3, '0')));
  }
  return index.filter(
    (entry) =>
      normalizeName(entry.displayName).includes(normalized) || normalizeName(entry.slug).includes(normalized),
  );
}
