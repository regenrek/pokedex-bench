/**
 * Typed models for the PokéAPI data layer.
 *
 * `Raw*` types mirror the slice of the official REST payload that this device
 * actually consumes. Domain types are what the UI renders. Keeping both apart
 * means a PokéAPI shape change can only break `transform.ts`.
 */

/* ------------------------------------------------------------------ raw -- */

export interface RawNamedResource {
  name: string
  url: string
}

export interface RawIndexResponse {
  count: number
  results: RawNamedResource[]
}

export interface RawPokemon {
  id: number
  name: string
  /** decimetres */
  height: number
  /** hectograms */
  weight: number
  base_experience: number | null
  types: { slot: number; type: RawNamedResource }[]
  abilities: { slot: number; is_hidden: boolean; ability: RawNamedResource }[]
  stats: { base_stat: number; effort: number; stat: RawNamedResource }[]
  sprites: {
    front_default: string | null
    front_shiny?: string | null
    other?: { 'official-artwork'?: { front_default?: string | null } }
  }
}

export interface RawSpecies {
  id: number
  name: string
  capture_rate?: number
  is_legendary?: boolean
  is_mythical?: boolean
  color?: RawNamedResource
  habitat?: RawNamedResource | null
  genera?: { genus: string; language: RawNamedResource }[]
  flavor_text_entries?: {
    flavor_text: string
    language: RawNamedResource
    version: RawNamedResource
  }[]
}

/* --------------------------------------------------------------- domain -- */

export type PokedexView = 'data' | 'stats' | 'index'

/** One row of the Kanto index list (`pokemon?limit=151`). */
export interface IndexEntry {
  id: number
  /** raw PokéAPI slug, e.g. `mr-mime` — used for matching */
  slug: string
  /** human display name, e.g. `Mr. Mime` */
  name: string
}

export interface StatEntry {
  /** raw PokéAPI stat slug, e.g. `special-attack` */
  key: string
  /** short LCD label, e.g. `SPA` */
  label: string
  value: number
}

export interface AbilityEntry {
  name: string
  hidden: boolean
}

export interface PokemonDetail {
  id: number
  name: string
  /** species genus, e.g. `Seed Pokémon` */
  genus: string | null
  spriteUrl: string | null
  types: string[]
  heightMeters: number
  weightKilograms: number
  stats: StatEntry[]
  abilities: AbilityEntry[]
  flavorText: string | null
  isLegendary: boolean
  isMythical: boolean
  /** set when the species record could not be read but the Pokémon record could */
  speciesWarning: string | null
}

/** Where a payload was served from — surfaced as the understated device status. */
export type CacheSource = 'network' | 'memory' | 'storage'

export interface Sourced<T> {
  data: T
  source: CacheSource
}
