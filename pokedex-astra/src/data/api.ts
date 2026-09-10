export interface NamedResource {
  name: string;
  url: string;
}
export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: { front_default: string | null; back_default: string | null };
  types: { type: NamedResource }[];
  abilities: { ability: NamedResource; is_hidden: boolean }[];
  stats: { base_stat: number; stat: NamedResource }[];
}
export interface Species {
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }[];
}
export interface Entry {
  id: number;
  name: string;
}
export interface PokemonData {
  pokemon: Pokemon;
  species: Species;
  cached: boolean;
}
const BASE = "https://pokeapi.co/api/v2/";
const PREFIX = "kanto-v1:";
const memory = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();
function read<T>(path: string): T | undefined {
  if (memory.has(path)) return memory.get(path) as T;
  try {
    const raw = localStorage.getItem(PREFIX + path);
    if (raw) {
      const value = JSON.parse(raw) as T;
      memory.set(path, value);
      return value;
    }
  } catch {
    /* Storage may be unavailable or contain a damaged entry. */
  }
}
async function resource<T>(path: string): Promise<T> {
  const stored = read<T>(path);
  if (stored !== undefined) return stored;
  if (pending.has(path)) return pending.get(path) as Promise<T>;
  const request = (async () => {
    const response = await fetch(BASE + path, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new Error("The research network is unavailable. Please try again.");
    const data = (await response.json()) as T;
    memory.set(path, data);
    try {
      localStorage.setItem(PREFIX + path, JSON.stringify(data));
    } catch {
      /* Memory cache remains available. */
    }
    return data;
  })();
  pending.set(path, request);
  try {
    return await request;
  } finally {
    pending.delete(path);
  }
}
export async function getIndex(): Promise<Entry[]> {
  const list = await resource<{ results: NamedResource[] }>(
    "pokemon?limit=151&offset=0",
  );
  return list.results.map((entry, i) => ({ id: i + 1, name: entry.name }));
}
export async function getPokemon(id: number): Promise<PokemonData> {
  if (!Number.isInteger(id) || id < 1 || id > 151)
    throw new Error("Choose a Pokémon from 001 to 151.");
  const cached =
    read(`pokemon/${id}`) !== undefined &&
    read(`pokemon-species/${id}`) !== undefined;
  const [pokemon, species] = await Promise.all([
    resource<Pokemon>(`pokemon/${id}`),
    resource<Species>(`pokemon-species/${id}`),
  ]);
  return { pokemon, species, cached };
}
export const number = (id: number) => String(id).padStart(3, "0");
export function formatName(name: string): string {
  const special: Record<string, string> = {
    "nidoran-f": "Nidoran ♀",
    "nidoran-m": "Nidoran ♂",
    "mr-mime": "Mr. Mime",
    farfetchd: "Farfetch’d",
  };
  return (
    special[name] ??
    name.replace(
      /(^|-)(\w)/g,
      (_, dash: string, letter: string) =>
        `${dash ? " " : ""}${letter.toUpperCase()}`,
    )
  );
}
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
export function resolveSearch(
  query: string,
  index: Entry[],
): number | undefined {
  const trimmed = query.trim();
  if (/^\d+$/.test(trimmed)) {
    const id = Number(trimmed);
    return id >= 1 && id <= 151 ? id : undefined;
  }
  return index.find((entry) => normalize(entry.name) === normalize(trimmed))
    ?.id;
}
export function description(species: Species): string {
  const english = species.flavor_text_entries.filter(
    (entry) => entry.language.name === "en",
  );
  return (
    (
      english.find((entry) => entry.version.name === "red") ?? english[0]
    )?.flavor_text
      .replace(/[\n\f\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "No field notes available for this Pokémon."
  );
}
