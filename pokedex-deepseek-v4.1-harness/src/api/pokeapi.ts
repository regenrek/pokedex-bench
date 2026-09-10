import { ResourceCache } from './cache';
import { POKEAPI_BASE_URL, type FetchLike, fetchJson } from './client';
import { PokeApiError } from './errors';
import type { Pokemon, PokemonListResponse, PokemonSpecies } from './types';
import {
  DEX_FIRST_ID,
  DEX_LAST_ID,
  type PokemonDetail,
  toPokemonDetail,
} from '../domain/pokemon';
import { formatName } from '../utils/format';

export interface IndexEntry {
  id: number;
  /** Raw API slug, e.g. `mr-mime`. */
  slug: string;
  /** Formatted name, e.g. `Mr. Mime`. */
  displayName: string;
}

export interface PokedexApi {
  /** All 151 Kanto entries — a single request, cached aggressively. */
  getIndex(): Promise<IndexEntry[]>;
  /** Combined `/pokemon/{id}` + `/pokemon-species/{id}` view model. */
  getDetail(id: number): Promise<PokemonDetail>;
  /**
   * Synchronous cache read. Lets the UI paint a previously seen entry in the
   * same frame as the key press instead of flashing a loading state.
   */
  peekDetail(id: number): PokemonDetail | null;
  /** True when the entry can be served without touching the network. */
  hasDetail(id: number): boolean;
  /** True when the 151-entry index is already cached. */
  hasIndex(): boolean;
  /** Fired for every network round-trip so the UI can show link activity. */
  onRequest(listener: (url: string) => void): () => void;
}

export interface PokedexApiOptions {
  fetchImpl?: FetchLike;
  cache?: ResourceCache;
  baseUrl?: string;
  timeoutMs?: number;
  /** Preload the neighbouring entries after a successful detail load. */
  prefetchNeighbours?: boolean;
}

const CACHE_KEYS = {
  index: 'index:kanto',
  detail: (id: number) => `detail:${id}`,
} as const;

/** `https://pokeapi.co/api/v2/pokemon/25/` -> `25` */
export function idFromResourceUrl(url: string): number | null {
  const match = /\/(\d+)\/?$/.exec(url);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function inDexRange(id: number): boolean {
  return Number.isInteger(id) && id >= DEX_FIRST_ID && id <= DEX_LAST_ID;
}

export function createPokedexApi(options: PokedexApiOptions = {}): PokedexApi {
  const cache = options.cache ?? new ResourceCache();
  const baseUrl = options.baseUrl ?? POKEAPI_BASE_URL;
  const fetchImpl = options.fetchImpl;
  const timeoutMs = options.timeoutMs;
  const prefetchNeighbours = options.prefetchNeighbours ?? false;

  const listeners = new Set<(url: string) => void>();

  const request = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
    listeners.forEach((listener) => listener(url));
    return fetchJson<T>(url, { fetchImpl, signal, timeoutMs });
  };

  const loadIndex = (signal?: AbortSignal): Promise<IndexEntry[]> =>
    cache.resolve(CACHE_KEYS.index, async () => {
      const payload = await request<PokemonListResponse>(
        `${baseUrl}/pokemon?limit=${DEX_LAST_ID}&offset=0`,
        signal,
      );
      return payload.results
        .map((resource) => {
          const id = idFromResourceUrl(resource.url);
          if (id === null || !inDexRange(id)) return null;
          return { id, slug: resource.name, displayName: formatName(resource.name) } satisfies IndexEntry;
        })
        .filter((entry): entry is IndexEntry => entry !== null)
        .sort((a, b) => a.id - b.id);
    });

  const loadDetail = (id: number, signal?: AbortSignal): Promise<PokemonDetail> => {
    if (!inDexRange(id)) {
      return Promise.reject(new PokeApiError('not-found', `#${id} is outside the Kanto index`, { status: 404 }));
    }
    return cache.resolve(CACHE_KEYS.detail(id), async () => {
      const [pokemon, species] = await Promise.all([
        request<Pokemon>(`${baseUrl}/pokemon/${id}`, signal),
        request<PokemonSpecies>(`${baseUrl}/pokemon-species/${id}`, signal),
      ]);
      return toPokemonDetail(pokemon, species);
    });
  };

  const api: PokedexApi = {
    getIndex: () => loadIndex(),
    getDetail: (id) => loadDetail(id),
    hasDetail: (id) => cache.get(CACHE_KEYS.detail(id)) !== null,
    hasIndex: () => cache.get(CACHE_KEYS.index) !== null,
    peekDetail: (id) => cache.get<PokemonDetail>(CACHE_KEYS.detail(id)),
    onRequest(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  if (prefetchNeighbours) {
    return {
      ...api,
      getDetail: async (id) => {
        const detail = await loadDetail(id);
        const schedule =
          typeof requestIdleCallback === 'function'
            ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2000 })
            : (cb: () => void) => setTimeout(cb, 350);
        schedule(() => {
          for (const neighbour of [id + 1, id - 1]) {
            if (inDexRange(neighbour) && cache.get(CACHE_KEYS.detail(neighbour)) === null) {
              void loadDetail(neighbour).catch(() => {
                /* prefetch is best-effort */
              });
            }
          }
        });
        return detail;
      },
    };
  }

  return api;
}

/** App-wide singleton; tests build their own instance with a fake `fetchImpl`. */
export const pokedexApi = createPokedexApi({
  prefetchNeighbours: import.meta.env.MODE !== 'test',
});
