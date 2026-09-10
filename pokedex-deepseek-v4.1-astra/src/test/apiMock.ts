/**
 * Deterministic PokéAPI stand-ins. Test-only: the app itself never ships data.
 */

import { vi } from 'vitest'
import type { RawIndexResponse, RawPokemon, RawSpecies } from '../api/types'

const SLUGS: Record<number, string> = {
  1: 'bulbasaur',
  2: 'ivysaur',
  4: 'charmander',
  25: 'pikachu',
  29: 'nidoran-f',
  32: 'nidoran-m',
  83: 'farfetchd',
  100: 'voltorb',
  122: 'mr-mime',
  151: 'mew',
}

const TYPES: Record<number, string[]> = {
  1: ['grass', 'poison'],
  4: ['fire'],
  25: ['electric'],
  122: ['psychic'],
  151: ['psychic'],
}

export function slugFor(id: number): string {
  return SLUGS[id] ?? `species-${id}`
}

export function typeFor(id: number): string {
  return TYPES[id]?.[0] ?? 'normal'
}

export function makeIndexResponse(): RawIndexResponse {
  const results = Array.from({ length: 151 }, (_, index) => {
    const id = index + 1
    return { name: slugFor(id), url: `https://pokeapi.co/api/v2/pokemon/${id}/` }
  })
  return { count: 151, results }
}

export function makePokemon(id: number, overrides: Partial<RawPokemon> = {}): RawPokemon {
  return {
    id,
    name: slugFor(id),
    height: id,
    weight: id * 2,
    base_experience: 64,
    types: (TYPES[id] ?? ['normal']).map((name, index) => ({
      slot: index + 1,
      type: { name, url: `https://pokeapi.co/api/v2/type/${name}/` },
    })),
    abilities: [
      { slot: 1, is_hidden: false, ability: { name: 'overgrow', url: '' } },
      { slot: 3, is_hidden: true, ability: { name: 'chlorophyll', url: '' } },
    ],
    stats: [
      { base_stat: 45, effort: 0, stat: { name: 'hp', url: '' } },
      { base_stat: 49, effort: 0, stat: { name: 'attack', url: '' } },
      { base_stat: 49, effort: 0, stat: { name: 'defense', url: '' } },
      { base_stat: 65, effort: 0, stat: { name: 'special-attack', url: '' } },
      { base_stat: 65, effort: 0, stat: { name: 'special-defense', url: '' } },
      { base_stat: 45, effort: 0, stat: { name: 'speed', url: '' } },
    ],
    sprites: { front_default: `https://sprites.test/${id}.png` },
    ...overrides,
  }
}

export function makeSpecies(id: number, overrides: Partial<RawSpecies> = {}): RawSpecies {
  return {
    id,
    name: slugFor(id),
    is_legendary: false,
    is_mythical: false,
    genera: [
      { genus: 'Seed Pokémon', language: { name: 'en', url: '' } },
      { genus: 'Pokémon Graine', language: { name: 'fr', url: '' } },
    ],
    flavor_text_entries: [
      {
        flavor_text: 'French text that must never be shown.',
        language: { name: 'fr', url: '' },
        version: { name: 'red', url: '' },
      },
      {
        flavor_text: 'An older English record.',
        language: { name: 'en', url: '' },
        version: { name: 'red', url: '' },
      },
      {
        flavor_text: `Entry ${id}\nstores\fpower in its\n\ncheeks.`,
        language: { name: 'en', url: '' },
        version: { name: 'lets-go-pikachu', url: '' },
      },
    ],
    ...overrides,
  }
}

interface FakeResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function ok(body: unknown): FakeResponse {
  return { ok: true, status: 200, json: async () => body }
}

function fail(status: number): FakeResponse {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('no body')
    },
  }
}

export interface ApiMock {
  /** every requested URL, in order */
  calls: string[]
  failList: boolean
  failIds: Set<number>
  failSpeciesIds: Set<number>
  /** artificial latency applied to every request, in ms */
  delayMs: number
  /** per-entry latency override, in ms — used to force out-of-order responses */
  delays: Map<number, number>
  countFor: (matcher: string | RegExp) => number
  restore: () => void
}

/** Install a deterministic global `fetch` for the PokéAPI surface. */
export function installApiMock(): ApiMock {
  const mock: ApiMock = {
    calls: [],
    failList: false,
    failIds: new Set<number>(),
    failSpeciesIds: new Set<number>(),
    delayMs: 0,
    delays: new Map<number, number>(),
    countFor: (matcher: string | RegExp) =>
      mock.calls.filter((url) =>
        typeof matcher === 'string' ? url.includes(matcher) : matcher.test(url),
      ).length,
    restore: () => {
      vi.unstubAllGlobals()
    },
  }

  const wait = async (id: number | null) => {
    const delay = id !== null && mock.delays.has(id) ? (mock.delays.get(id) as number) : mock.delayMs
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
  }

  const impl = async (input: RequestInfo | URL): Promise<FakeResponse> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : String(input.url)
    mock.calls.push(url)

    if (url.includes('/pokemon?limit=')) {
      await wait(null)
      if (mock.failList) throw new TypeError('Failed to fetch')
      return ok(makeIndexResponse())
    }

    const pokemonMatch = /\/pokemon\/(\d+)\/?$/.exec(url)
    if (pokemonMatch) {
      const id = Number(pokemonMatch[1])
      await wait(id)
      if (mock.failIds.has(id)) return fail(503)
      return ok(makePokemon(id))
    }

    const speciesMatch = /\/pokemon-species\/(\d+)\/?$/.exec(url)
    if (speciesMatch) {
      const id = Number(speciesMatch[1])
      await wait(id)
      if (mock.failSpeciesIds.has(id)) return fail(404)
      return ok(makeSpecies(id))
    }

    return fail(404)
  }

  vi.stubGlobal('fetch', vi.fn(impl))
  return mock
}
