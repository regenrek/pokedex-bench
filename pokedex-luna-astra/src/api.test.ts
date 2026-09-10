import { describe, expect, it, vi } from 'vitest';
import { cleanFlavor, formatId, loadEntry, normalizeQuery } from './api';

describe('Kanto input', () => {
  it.each([['pikachu', 'pikachu'], ['Pikachu', 'pikachu'], ['25', '25'], ['025', '25'], [' 025 ', '25']])('normalizes %s', (input, expected) => expect(normalizeQuery(input)).toBe(expected));
  it.each(['', '0', '152', '-1', '25.5', '#25'])('rejects invalid input %s', input => expect(() => normalizeQuery(input)).toThrow());
  it('formats numbers and cleans cartridge line breaks', () => {
    expect(formatId(1)).toBe('001');
    expect(cleanFlavor('A strange\nseed was\fplanted.  ')).toBe('A strange seed was planted.');
  });
});
describe('API caching and failures', () => {
  it('fetches details lazily and reuses the combined record', async () => {
    const pokemon = { id: 7, name: 'squirtle', stats: [], types: [], abilities: [], sprites: { front_default: null }, height: 5, weight: 90 };
    const species = { flavor_text_entries: [], genera: [] };
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => pokemon } as Response).mockResolvedValueOnce({ ok: true, json: async () => species } as Response);
    const first = await loadEntry('007', new AbortController().signal);
    const second = await loadEntry('7', new AbortController().signal);
    expect(first.cached).toBe(false); expect(second.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('kanto-pokedex:v1:7')).toContain('squirtle');
    fetcher.mockRestore();
  });
  it('rejects species outside generation one before requesting species details', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ id: 152 }) } as Response);
    await expect(loadEntry('chikorita', new AbortController().signal)).rejects.toThrow('outside Kanto');
    expect(fetcher).toHaveBeenCalledTimes(1); fetcher.mockRestore();
  });
  it('reports a useful not-found error', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(loadEntry('notapokemon', new AbortController().signal)).rejects.toThrow('No Pokémon found');
    fetcher.mockRestore();
  });
});
