/** Query → dex number resolution for the device search field. */

import { KANTO_LIMIT } from '../api/pokeapi'
import type { IndexEntry } from '../api/types'

export type SearchResolution =
  | { ok: true; id: number; matchedBy: 'number' | 'name' }
  | { ok: false; message: string }

/**
 * Fold a user query to a comparison key:
 * case-insensitive, punctuation- and space-insensitive, with the Gen I gender
 * glyphs mapped to their slug letters.
 *
 * `Mr. Mime` / `mr-mime` → `mrmime`, `Farfetch'd` → `farfetchd`,
 * `Nidoran ♀` / `nidoran-f` → `nidoranf`.
 */
export function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(/[^a-z0-9]+/g, '')
}

function quote(value: string): string {
  const clipped = value.length > 24 ? `${value.slice(0, 24)}…` : value
  return `“${clipped}”`
}

function pad(id: number): string {
  return String(Math.max(0, Math.trunc(id))).padStart(3, '0')
}

/**
 * Resolve a search string against the loaded index.
 * Never throws and never mutates: the caller keeps the current entry on failure.
 */
export function resolveSearch(
  rawQuery: string,
  entries: readonly IndexEntry[] | null,
): SearchResolution {
  const trimmed = rawQuery.trim()
  if (trimmed === '') {
    return { ok: false, message: 'Enter a name or a dex number from 001 to 151.' }
  }

  const bare = trimmed.replace(/^#\s*/, '').trim()

  if (/^\d+$/.test(bare)) {
    const id = Number(bare)
    if (!Number.isInteger(id) || id < 1 || id > KANTO_LIMIT) {
      return {
        ok: false,
        message: `No. ${pad(id)} is outside the Kanto index (001–151).`,
      }
    }
    return { ok: true, id, matchedBy: 'number' }
  }

  const key = normalizeQuery(bare)
  if (key === '') {
    return { ok: false, message: `No Kanto entry matches ${quote(trimmed)}.` }
  }

  if (!entries || entries.length === 0) {
    return {
      ok: false,
      message: 'Index list not loaded yet. Enter a number from 1 to 151, or retry the list.',
    }
  }

  const hit =
    entries.find((entry) => normalizeQuery(entry.slug) === key) ??
    entries.find((entry) => normalizeQuery(entry.name) === key)

  if (!hit) {
    return {
      ok: false,
      message: `No Kanto entry matches ${quote(trimmed)}. Try Pikachu, Mr. Mime or a number 1–151.`,
    }
  }
  return { ok: true, id: hit.id, matchedBy: 'name' }
}

export function clampDexId(id: number): number {
  if (!Number.isFinite(id)) return 1
  return Math.min(KANTO_LIMIT, Math.max(1, Math.trunc(id)))
}
