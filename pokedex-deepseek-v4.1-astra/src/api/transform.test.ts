import { describe, expect, it } from 'vitest'
import {
  cleanFlavorText,
  formatDisplayName,
  formatDexNumber,
  formatKilograms,
  formatMeters,
  sourceLabel,
  statLabel,
} from '../lib/format'
import {
  isIndexEntryList,
  isRawPokemon,
  pickFlavorText,
  toIndexEntries,
  toPokemonDetail,
} from './transform'
import { makePokemon, makeSpecies } from '../test/apiMock'
import type { RawIndexResponse } from './types'

describe('format helpers', () => {
  it('formats Gen I names with their official punctuation', () => {
    expect(formatDisplayName('bulbasaur')).toBe('Bulbasaur')
    expect(formatDisplayName('mr-mime')).toBe('Mr. Mime')
    expect(formatDisplayName('farfetchd')).toBe("Farfetch'd")
    expect(formatDisplayName('nidoran-f')).toBe('Nidoran ♀')
    expect(formatDisplayName('nidoran-m')).toBe('Nidoran ♂')
  })

  it('converts PokéAPI units', () => {
    expect(formatMeters(0.7)).toBe('0.7 m')
    expect(formatKilograms(6.9)).toBe('6.9 kg')
    expect(formatMeters(Number.NaN)).toBe('--')
  })

  it('pads dex numbers and labels stats and cache sources', () => {
    expect(formatDexNumber(1)).toBe('001')
    expect(formatDexNumber(151)).toBe('151')
    expect(statLabel('special-attack')).toBe('SPA')
    expect(statLabel('hp')).toBe('HP')
    expect(sourceLabel('memory')).toBe('MEMORY')
    expect(sourceLabel('storage')).toBe('CACHED')
    expect(sourceLabel('network')).toBe('LIVE LINK')
  })

  it('cleans newlines, form feeds, soft hyphens and runs of whitespace', () => {
    expect(cleanFlavorText('A strange\nseed was\fplanted\n\non its back.')).toBe(
      'A strange seed was planted on its back.',
    )
    expect(cleanFlavorText('Soft\u00adhyphen   and\tspaces ')).toBe('Softhyphen and spaces')
    expect(cleanFlavorText('\n\n  ')).toBe('')
  })
})

describe('toIndexEntries', () => {
  it('derives ids from resource URLs, names them and sorts by dex number', () => {
    const raw: RawIndexResponse = {
      count: 3,
      results: [
        { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
        { name: 'mr-mime', url: 'https://pokeapi.co/api/v2/pokemon/122' },
        { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      ],
    }

    expect(toIndexEntries(raw)).toEqual([
      { id: 1, slug: 'bulbasaur', name: 'Bulbasaur' },
      { id: 25, slug: 'pikachu', name: 'Pikachu' },
      { id: 122, slug: 'mr-mime', name: 'Mr. Mime' },
    ])
  })

  it('falls back to list position when a URL is malformed and skips nameless rows', () => {
    const raw: RawIndexResponse = {
      count: 3,
      results: [
        { name: 'bulbasaur', url: 'not-a-url' },
        { name: '', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      ],
    }
    expect(toIndexEntries(raw)).toEqual([{ id: 1, slug: 'bulbasaur', name: 'Bulbasaur' }])
  })
})

describe('toPokemonDetail', () => {
  it('builds the domain model from raw Pokémon + species payloads', () => {
    const detail = toPokemonDetail(makePokemon(1), makeSpecies(1))

    expect(detail.id).toBe(1)
    expect(detail.name).toBe('Bulbasaur')
    expect(detail.genus).toBe('Seed Pokémon')
    expect(detail.types).toEqual(['GRASS', 'POISON'])
    expect(detail.heightMeters).toBeCloseTo(0.1) // mock returns height = id decimetres
    expect(detail.weightKilograms).toBeCloseTo(0.2) // mock returns weight = id * 2 hectograms
    expect(detail.spriteUrl).toBe('https://sprites.test/1.png')
    expect(detail.stats.map((stat) => stat.label)).toEqual(['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'])
    expect(detail.stats[0].value).toBe(45)
    expect(detail.abilities).toEqual([
      { name: 'Overgrow', hidden: false },
      { name: 'Chlorophyll', hidden: true },
    ])
    expect(detail.flavorText).toBe('Entry 1 stores power in its cheeks.')
    expect(detail.speciesWarning).toBeNull()
  })

  it('keeps the Pokémon record usable when the species record is missing', () => {
    const detail = toPokemonDetail(makePokemon(25), null, 'PokéAPI has no record for that entry.')
    expect(detail.name).toBe('Pikachu')
    expect(detail.flavorText).toBeNull()
    expect(detail.genus).toBeNull()
    expect(detail.speciesWarning).toBe('PokéAPI has no record for that entry.')
  })

  it('survives a payload with missing collections', () => {
    const broken = { id: 7, name: 'squirtle', height: 5, weight: 90, sprites: {} }
    const detail = toPokemonDetail(broken as never, null)
    expect(detail.types).toEqual([])
    expect(detail.stats).toEqual([])
    expect(detail.abilities).toEqual([])
    expect(detail.spriteUrl).toBeNull()
  })
})

describe('pickFlavorText', () => {
  it('prefers the most recent English entry', () => {
    expect(pickFlavorText(makeSpecies(4))).toBe('Entry 4 stores power in its cheeks.')
    expect(pickFlavorText(null)).toBeNull()
  })
})

describe('cache validators', () => {
  it('accepts well-formed payloads', () => {
    expect(isRawPokemon(makePokemon(1))).toBe(true)
    expect(isIndexEntryList([{ id: 1, slug: 'bulbasaur', name: 'Bulbasaur' }])).toBe(true)
  })

  it('rejects corrupt cache contents', () => {
    expect(isRawPokemon({ id: 'one', name: 'bulbasaur', types: [], stats: [], sprites: {} })).toBe(
      false,
    )
    expect(isRawPokemon(null)).toBe(false)
    expect(isRawPokemon({ id: 1, name: 'x' })).toBe(false)
    expect(isIndexEntryList([{ id: 1, slug: 'bulbasaur' }])).toBe(false)
    expect(isIndexEntryList('nope')).toBe(false)
  })
})
