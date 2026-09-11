import { afterEach, describe, expect, it, vi } from 'vitest'
import { __clearMemoryCache, getPokemon, resolvePokemonQuery } from './api'

const index = [
  { id: 1, name: 'Bulbasaur' },
  { id: 25, name: 'Pikachu' },
  { id: 151, name: 'Mew' },
]

describe('query resolution', () => {
  it.each([
    ['pikachu', 25],
    ['Pikachu', 25],
    ['25', 25],
    ['025', 25],
    ['#151', 151],
  ])('resolves %s to %i', (query, expected) => {
    expect(resolvePokemonQuery(query, index)).toBe(expected)
  })

  it.each(['', '0', '152', 'missingno'])('rejects invalid query %s', (query) => {
    expect(resolvePokemonQuery(query, index)).toBeNull()
  })
})

describe('PokéAPI cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    __clearMemoryCache()
  })

  it('reuses cached assembled records on repeated access', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        id: 1,
        name: 'bulbasaur',
        sprites: { front_default: 'sprite.png' },
        types: [{ slot: 1, type: { name: 'grass' } }],
        height: 7,
        weight: 69,
        abilities: [{ ability: { name: 'overgrow' } }],
        stats: [{ base_stat: 45, stat: { name: 'hp' } }],
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        flavor_text_entries: [{ flavor_text: 'A seed\nPokémon.', language: { name: 'en' } }],
        genera: [{ genus: 'Seed Pokémon', language: { name: 'en' } }],
        habitat: { name: 'grassland' },
      }) })
    vi.stubGlobal('fetch', fetchMock)

    const first = await getPokemon(1)
    const second = await getPokemon(1)

    expect(first.name).toBe('Bulbasaur')
    expect(first.description).toBe('A seed Pokémon.')
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
