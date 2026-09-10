export interface Pokemon {
  id: number; name: string; height: number; weight: number;
  sprites: { front_default: string | null; back_default: string | null };
  types: { slot: number; type: { name: string } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  stats: { base_stat: number; stat: { name: string } }[];
}
export interface Species {
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  genera: { genus: string; language: { name: string } }[];
  habitat: { name: string } | null;
  capture_rate: number; growth_rate: { name: string };
}
export interface Entry { pokemon: Pokemon; species: Species }
const memory = new Map<number, Entry>();
const PREFIX = 'kanto-pokedex:v1:';
export interface IndexItem { name: string; url: string }
let indexPromise: Promise<IndexItem[]> | null = null;
export function loadIndex(): Promise<IndexItem[]> {
  if (indexPromise) return indexPromise;
  try { const saved = JSON.parse(localStorage.getItem(PREFIX + 'index') ?? 'null') as IndexItem[] | null; if (saved?.length === 151 && saved.every(item => typeof item.name === 'string')) return Promise.resolve(saved); } catch { /* Optional storage. */ }
  indexPromise = fetch('https://pokeapi.co/api/v2/pokemon?limit=151&offset=0').then(async response => {
    if (!response.ok) throw new Error('Index connection failed.');
    const data = await response.json() as { results: IndexItem[] };
    try { localStorage.setItem(PREFIX + 'index', JSON.stringify(data.results)); } catch { /* Optional storage. */ }
    return data.results;
  }).catch(error => { indexPromise = null; throw error; });
  return indexPromise;
}
export const displayName = (name: string) => name.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
export const formatId = (id: number) => String(id).padStart(3, '0');
export const cleanFlavor = (value: string) => value.replace(/[\n\r\f]/g, ' ').replace(/\s+/g, ' ').trim();
export function normalizeQuery(value: string): string {
  const query = value.trim().toLowerCase();
  if (!query) throw new Error('Enter a Pokémon name or number.');
  if (/^\d+$/.test(query)) {
    const id = Number(query);
    if (id < 1 || id > 151) throw new Error('Kanto entries range from 001 to 151.');
    return String(id);
  }
  if (!/^[a-z][a-z .♀♂-]*$/.test(query)) throw new Error('Use a Pokémon name or a number from 001–151.');
  return ({ 'mr. mime': 'mr-mime', 'mr mime': 'mr-mime', 'nidoran♀': 'nidoran-f', 'nidoran♂': 'nidoran-m' } as Record<string, string>)[query] ?? query;
}
export function readCached(id: number): Entry | null {
  if (memory.has(id)) return memory.get(id)!;
  try {
    const saved = JSON.parse(localStorage.getItem(PREFIX + id) ?? 'null') as Entry | null;
    if (saved?.pokemon?.id === id && Array.isArray(saved.pokemon.stats) && Array.isArray(saved.pokemon.types) && saved.pokemon.sprites && Array.isArray(saved.species?.flavor_text_entries) && Array.isArray(saved.species.genera)) {
      memory.set(id, saved); return saved;
    }
  } catch { /* Browser storage may be unavailable. */ }
  return null;
}
async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`https://pokeapi.co/api/v2/${path}`, { signal });
  if (response.status === 404) throw new Error('No Pokémon found. Try a name or number from 001–151.');
  if (!response.ok) throw new Error('The Pokédex could not connect. Please try again.');
  return response.json() as Promise<T>;
}
export async function loadEntry(query: string, signal: AbortSignal): Promise<{ entry: Entry; cached: boolean }> {
  const normalized = normalizeQuery(query);
  const known = /^\d+$/.test(normalized) ? readCached(Number(normalized)) : [...memory.values()].find(e => e.pokemon.name === normalized);
  if (known) return { entry: known, cached: true };
  const pokemon = await request<Pokemon>(`pokemon/${normalized}`, signal);
  if (pokemon.id > 151 || pokemon.id < 1) throw new Error('This Pokémon is outside Kanto. Choose entry 001–151.');
  const cached = readCached(pokemon.id);
  if (cached) return { entry: cached, cached: true };
  const species = await request<Species>(`pokemon-species/${pokemon.id}`, signal);
  const entry = { pokemon, species };
  memory.set(pokemon.id, entry);
  try { localStorage.setItem(PREFIX + pokemon.id, JSON.stringify(entry)); } catch { /* Memory caching remains available. */ }
  return { entry, cached: false };
}
