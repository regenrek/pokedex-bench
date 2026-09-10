/**
 * Endpoint layer: one function per PokéAPI resource this device uses.
 *
 * - `pokemon?limit=151&offset=0` — fetched once, cached, drives search + INDEX
 * - `pokemon/{id}` — fetched lazily for the selected entry
 * - `pokemon-species/{id}` — fetched lazily for flavor text / genus
 *
 * The other 150 entries are never eagerly loaded.
 */

import { cacheKeys, loadCached } from './cache'
import { ApiError, apiGet, toDisplayMessage } from './client'
import {
  isIndexEntryList,
  isRawPokemon,
  isRawSpecies,
  toIndexEntries,
  toPokemonDetail,
} from './transform'
import type {
  IndexEntry,
  PokemonDetail,
  RawIndexResponse,
  RawPokemon,
  RawSpecies,
  Sourced,
} from './types'

export const KANTO_LIMIT = 151

export interface DetailOptions {
  signal?: AbortSignal
  bypassCache?: boolean
}

/** The 151-entry Kanto index. */
export function fetchIndex(options: DetailOptions = {}): Promise<Sourced<IndexEntry[]>> {
  return loadCached(
    cacheKeys.index(),
    isIndexEntryList,
    async () => {
      const raw = await apiGet<RawIndexResponse>(
        `/pokemon?limit=${KANTO_LIMIT}&offset=0`,
        { signal: options.signal },
      )
      const entries = toIndexEntries(raw)
      if (entries.length === 0) {
        throw new ApiError('PokéAPI returned an empty index.', {
          kind: 'payload',
          url: 'pokemon?limit=151&offset=0',
        })
      }
      return entries
    },
    { bypassCache: options.bypassCache },
  )
}

/** Detail for one entry, composed from the Pokémon and species resources. */
export async function fetchDetail(
  id: number,
  options: DetailOptions = {},
): Promise<Sourced<PokemonDetail>> {
  const pokemon = await loadCached(
    cacheKeys.pokemon(id),
    isRawPokemon,
    () => apiGet<RawPokemon>(`/pokemon/${id}`, { signal: options.signal }),
    { bypassCache: options.bypassCache },
  )

  let species: Sourced<RawSpecies> | null = null
  let speciesWarning: string | null = null
  try {
    species = await loadCached(
      cacheKeys.species(id),
      isRawSpecies,
      () => apiGet<RawSpecies>(`/pokemon-species/${id}`, { signal: options.signal }),
      { bypassCache: options.bypassCache },
    )
  } catch (error) {
    // A missing species record must not blank the whole screen.
    speciesWarning = toDisplayMessage(error)
  }

  return {
    data: toPokemonDetail(pokemon.data, species?.data ?? null, speciesWarning),
    source: combineSources(pokemon.source, species?.source ?? null),
  }
}

/** Report the least-cached layer involved so `CACHED` never overstates freshness. */
function combineSources(
  a: Sourced<unknown>['source'],
  b: Sourced<unknown>['source'] | null,
): Sourced<unknown>['source'] {
  const all = [a, b]
  if (all.includes('network')) return 'network'
  if (all.includes('storage')) return 'storage'
  return 'memory'
}
