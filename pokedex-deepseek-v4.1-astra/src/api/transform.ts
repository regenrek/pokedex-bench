/**
 * Raw PokéAPI payload → domain model, plus the minimal validators used to
 * reject corrupt cache entries.
 */

import { abilityLabel, cleanFlavorText, formatDisplayName, statLabel, typeLabel } from '../lib/format'
import { decimetersToMeters, hectogramsToKilograms } from '../lib/format'
import type {
  AbilityEntry,
  IndexEntry,
  PokemonDetail,
  RawIndexResponse,
  RawPokemon,
  RawSpecies,
  StatEntry,
} from './types'

/* ------------------------------------------------------------ validators -- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Deliberately shallow: enough to reject garbage, tolerant of new API fields. */
export function isIndexEntryList(value: unknown): value is IndexEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'number' &&
        Number.isFinite(item.id) &&
        typeof item.slug === 'string' &&
        typeof item.name === 'string',
    )
  )
}

export function isRawPokemon(value: unknown): value is RawPokemon {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Number.isFinite(value.id) &&
    typeof value.name === 'string' &&
    Array.isArray(value.types) &&
    Array.isArray(value.stats) &&
    typeof value.sprites === 'object' &&
    value.sprites !== null
  )
}

export function isRawSpecies(value: unknown): value is RawSpecies {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Number.isFinite(value.id) &&
    typeof value.name === 'string'
  )
}

/* ----------------------------------------------------------- transforms -- */

/** `/pokemon/25/` → 25 */
function idFromResourceUrl(url: string): number | null {
  const match = /\/(\d+)\/?$/.exec(url)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

/**
 * Kanto index rows, sorted by dex number.
 * Ids come from the resource URL; a malformed URL falls back to list position.
 */
export function toIndexEntries(raw: RawIndexResponse): IndexEntry[] {
  const results = Array.isArray(raw?.results) ? raw.results : []
  return results
    .map((resource, index) => {
      const slug = typeof resource?.name === 'string' ? resource.name : ''
      const url = typeof resource?.url === 'string' ? resource.url : ''
      const id = idFromResourceUrl(url) ?? index + 1
      return { id, slug, name: formatDisplayName(slug || `#${id}`) }
    })
    .filter((entry) => entry.slug !== '' && entry.id > 0)
    .sort((a, b) => a.id - b.id)
}

function toStats(raw: RawPokemon): StatEntry[] {
  if (!Array.isArray(raw.stats)) return []
  return raw.stats
    .map((entry) => {
      const key = entry?.stat?.name ?? ''
      const value = Number(entry?.base_stat)
      return { key, label: statLabel(key), value: Number.isFinite(value) ? value : 0 }
    })
    .filter((entry) => entry.key !== '')
}

function toAbilities(raw: RawPokemon): AbilityEntry[] {
  if (!Array.isArray(raw.abilities)) return []
  return raw.abilities
    .map((entry) => ({
      name: abilityLabel(entry?.ability?.name ?? ''),
      hidden: Boolean(entry?.is_hidden),
    }))
    .filter((entry) => entry.name !== '')
}

function toTypes(raw: RawPokemon): string[] {
  if (!Array.isArray(raw.types)) return []
  return raw.types
    .slice()
    .sort((a, b) => (a?.slot ?? 0) - (b?.slot ?? 0))
    .map((entry) => typeLabel(entry?.type?.name ?? ''))
    .filter(Boolean)
}

function toSprite(raw: RawPokemon): string | null {
  const front = raw.sprites?.front_default
  if (typeof front === 'string' && front) return front
  const artwork = raw.sprites?.other?.['official-artwork']?.front_default
  return typeof artwork === 'string' && artwork ? artwork : null
}

/** Latest English flavor text; falls back to the first English entry. */
export function pickFlavorText(species: RawSpecies | null): string | null {
  const entries = species?.flavor_text_entries
  if (!Array.isArray(entries)) return null
  const english = entries.filter((entry) => entry?.language?.name === 'en')
  const chosen = english.length > 0 ? english[english.length - 1] : undefined
  if (!chosen || typeof chosen.flavor_text !== 'string') return null
  const cleaned = cleanFlavorText(chosen.flavor_text)
  return cleaned || null
}

export function pickGenus(species: RawSpecies | null): string | null {
  const genera = species?.genera
  if (!Array.isArray(genera)) return null
  const english = genera.find((entry) => entry?.language?.name === 'en')
  return english?.genus ? english.genus : null
}

export function toPokemonDetail(
  raw: RawPokemon,
  species: RawSpecies | null,
  speciesWarning: string | null = null,
): PokemonDetail {
  const height = Number(raw.height)
  const weight = Number(raw.weight)
  return {
    id: raw.id,
    name: formatDisplayName(raw.name),
    genus: pickGenus(species),
    spriteUrl: toSprite(raw),
    types: toTypes(raw),
    heightMeters: decimetersToMeters(height),
    weightKilograms: hectogramsToKilograms(weight),
    stats: toStats(raw),
    abilities: toAbilities(raw),
    flavorText: pickFlavorText(species),
    isLegendary: Boolean(species?.is_legendary),
    isMythical: Boolean(species?.is_mythical),
    speciesWarning,
  }
}

/** Highest base stat in the Kanto dex is 255 — used to scale the LCD bars. */
export const STAT_BAR_MAX = 255
