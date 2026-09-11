const API_ROOT = 'https://pokeapi.co/api/v2'
const CACHE_PREFIX = 'kanto-field-index:v1:'

export interface PokemonListItem {
  id: number
  name: string
}

export interface PokemonStat {
  key: string
  label: string
  value: number
}

export interface PokemonRecord {
  id: number
  name: string
  sprite: string
  types: string[]
  heightM: number
  weightKg: number
  abilities: string[]
  stats: PokemonStat[]
  description: string
  genus: string
  habitat: string
}

interface RawPokemon {
  id: number
  name: string
  sprites: {
    front_default: string | null
    versions?: { 'generation-v'?: { 'black-white'?: { animated?: { front_default?: string | null } } } }
  }
  types: Array<{ slot: number; type: { name: string } }>
  height: number
  weight: number
  abilities: Array<{ ability: { name: string } }>
  stats: Array<{ base_stat: number; stat: { name: string } }>
}

interface RawSpecies {
  flavor_text_entries: Array<{ flavor_text: string; language: { name: string } }>
  genera: Array<{ genus: string; language: { name: string } }>
  habitat: { name: string } | null
}

interface RawList {
  results: Array<{ name: string }>
}

const memory = new Map<string, unknown>()

function readStored<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(CACHE_PREFIX + key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function store<T>(key: string, value: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Memory caching still works when storage is blocked or full.
  }
}

async function cachedJson<T>(key: string, url: string): Promise<T> {
  const inMemory = memory.get(key) as T | undefined
  if (inMemory) return inMemory
  const stored = readStored<T>(key)
  if (stored) {
    memory.set(key, stored)
    return stored
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`PokéAPI request failed (${response.status})`)
  const value = (await response.json()) as T
  memory.set(key, value)
  store(key, value)
  return value
}

const statLabels: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'S.ATK',
  'special-defense': 'S.DEF',
  speed: 'SPD',
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function getPokemon(id: number): Promise<PokemonRecord> {
  const cached = readStored<PokemonRecord>(`record:${id}`)
  if (cached) return cached

  const [pokemon, species] = await Promise.all([
    cachedJson<RawPokemon>(`pokemon:${id}`, `${API_ROOT}/pokemon/${id}`),
    cachedJson<RawSpecies>(`species:${id}`, `${API_ROOT}/pokemon-species/${id}`),
  ])
  const englishFlavor = species.flavor_text_entries.find((entry) => entry.language.name === 'en')
  const englishGenus = species.genera.find((entry) => entry.language.name === 'en')
  const animated = pokemon.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default
  const record: PokemonRecord = {
    id: pokemon.id,
    name: titleCase(pokemon.name),
    sprite: animated || pokemon.sprites.front_default || '',
    types: pokemon.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    heightM: pokemon.height / 10,
    weightKg: pokemon.weight / 10,
    abilities: pokemon.abilities.map((entry) => titleCase(entry.ability.name)),
    stats: pokemon.stats.map((entry) => ({
      key: entry.stat.name,
      label: statLabels[entry.stat.name] || entry.stat.name.toUpperCase(),
      value: entry.base_stat,
    })),
    description: englishFlavor?.flavor_text.replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim() || 'No field notes available.',
    genus: englishGenus?.genus || 'Unknown Pokémon',
    habitat: species.habitat ? titleCase(species.habitat.name) : 'Unknown',
  }
  store(`record:${id}`, record)
  return record
}

export async function getKantoIndex(): Promise<PokemonListItem[]> {
  const data = await cachedJson<RawList>('index', `${API_ROOT}/pokemon?limit=151&offset=0`)
  return data.results.map((pokemon, index) => ({ id: index + 1, name: titleCase(pokemon.name) }))
}

export function resolvePokemonQuery(query: string, list: PokemonListItem[]): number | null {
  const normalized = query.trim().toLowerCase().replace(/^#/, '')
  if (!normalized) return null
  if (/^\d+$/.test(normalized)) {
    const id = Number.parseInt(normalized, 10)
    return id >= 1 && id <= 151 ? id : null
  }
  return list.find((item) => item.name.toLowerCase() === normalized)?.id ?? null
}

export function padId(id: number) {
  return String(id).padStart(3, '0')
}

export function __clearMemoryCache() {
  memory.clear()
}
