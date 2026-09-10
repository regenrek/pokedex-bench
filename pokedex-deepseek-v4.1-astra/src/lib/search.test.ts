import { describe, expect, it } from 'vitest'
import type { IndexEntry } from '../api/types'
import { clampDexId, normalizeQuery, resolveSearch } from './search'

const ENTRIES: IndexEntry[] = [
  { id: 1, slug: 'bulbasaur', name: 'Bulbasaur' },
  { id: 25, slug: 'pikachu', name: 'Pikachu' },
  { id: 29, slug: 'nidoran-f', name: 'Nidoran ♀' },
  { id: 32, slug: 'nidoran-m', name: 'Nidoran ♂' },
  { id: 83, slug: 'farfetchd', name: "Farfetch'd" },
  { id: 122, slug: 'mr-mime', name: 'Mr. Mime' },
  { id: 151, slug: 'mew', name: 'Mew' },
]

describe('normalizeQuery', () => {
  it('folds case, spaces and punctuation', () => {
    expect(normalizeQuery('  Pikachu ')).toBe('pikachu')
    expect(normalizeQuery('Mr. Mime')).toBe('mrmime')
    expect(normalizeQuery('mr-mime')).toBe('mrmime')
    expect(normalizeQuery('MR  MIME')).toBe('mrmime')
    expect(normalizeQuery("Farfetch'd")).toBe('farfetchd')
    expect(normalizeQuery('farfetchd')).toBe('farfetchd')
  })

  it('maps Gen I gender glyphs onto their slug letters', () => {
    expect(normalizeQuery('Nidoran ♀')).toBe('nidoranf')
    expect(normalizeQuery('nidoran-f')).toBe('nidoranf')
    expect(normalizeQuery('Nidoran♂')).toBe('nidoranm')
    expect(normalizeQuery('nidoran-m')).toBe('nidoranm')
  })
})

describe('resolveSearch', () => {
  it('resolves names case-insensitively', () => {
    for (const query of ['pikachu', 'Pikachu', 'PIKACHU', '  pikachu  ']) {
      expect(resolveSearch(query, ENTRIES)).toEqual({ ok: true, id: 25, matchedBy: 'name' })
    }
  })

  it('resolves zero-padded and hash-prefixed numbers', () => {
    for (const query of ['25', '025', '#25', ' #025 ']) {
      expect(resolveSearch(query, ENTRIES)).toEqual({ ok: true, id: 25, matchedBy: 'number' })
    }
  })

  it('resolves punctuated Gen I names', () => {
    expect(resolveSearch('Mr. Mime', ENTRIES)).toEqual({ ok: true, id: 122, matchedBy: 'name' })
    expect(resolveSearch('mr mime', ENTRIES)).toEqual({ ok: true, id: 122, matchedBy: 'name' })
    expect(resolveSearch("Farfetch'd", ENTRIES)).toEqual({ ok: true, id: 83, matchedBy: 'name' })
    expect(resolveSearch('Nidoran ♀', ENTRIES)).toEqual({ ok: true, id: 29, matchedBy: 'name' })
    expect(resolveSearch('Nidoran ♂', ENTRIES)).toEqual({ ok: true, id: 32, matchedBy: 'name' })
  })

  it('accepts the numeric bounds and rejects everything outside them', () => {
    expect(resolveSearch('1', ENTRIES)).toEqual({ ok: true, id: 1, matchedBy: 'number' })
    expect(resolveSearch('151', ENTRIES)).toEqual({ ok: true, id: 151, matchedBy: 'number' })

    for (const query of ['0', '152', '999', '0152']) {
      const result = resolveSearch(query, ENTRIES)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.message).toMatch(/outside the Kanto index/)
    }
  })

  it('rejects empty and whitespace-only input', () => {
    for (const query of ['', '   ', '\t']) {
      const result = resolveSearch(query, ENTRIES)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.message).toMatch(/Enter a name or a dex number/)
    }
  })

  it('reports unknown names without throwing', () => {
    const result = resolveSearch('missingno', ENTRIES)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/No Kanto entry matches “missingno”/)
  })

  it('reports malformed non-numeric input as an unknown name', () => {
    const result = resolveSearch('12abc', ENTRIES)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/No Kanto entry matches/)
  })

  it('explains that the list is still loading when a name cannot be matched yet', () => {
    const result = resolveSearch('pikachu', null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/Index list not loaded yet/)
  })

  it('still resolves numbers when the list has not loaded', () => {
    expect(resolveSearch('25', null)).toEqual({ ok: true, id: 25, matchedBy: 'number' })
  })
})

describe('clampDexId', () => {
  it('keeps ids inside 1–151', () => {
    expect(clampDexId(0)).toBe(1)
    expect(clampDexId(-7)).toBe(1)
    expect(clampDexId(200)).toBe(151)
    expect(clampDexId(25.9)).toBe(25)
    expect(clampDexId(Number.NaN)).toBe(1)
  })
})
