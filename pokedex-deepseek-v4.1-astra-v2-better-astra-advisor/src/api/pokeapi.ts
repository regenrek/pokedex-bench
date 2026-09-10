/**
 * Typed PokéAPI v2 data layer.
 *
 * Every network call for the application goes through this module: components
 * never call `fetch` directly. Responses are cached in memory + localStorage.
 */
import { createResourceCache, getBrowserStorage } from './cache';
import type {
  PokemonListResponse,
  PokemonResponse,
  PokemonSpeciesResponse,
} from './types';

export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
export const GEN1_COUNT = 151;
export const FIRST_ID = 1;
export const LAST_ID = GEN1_COUNT;

export const CACHE_NAMESPACE = 'kanto-pokedex:v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // one week

const DEFAULT_TIMEOUT_MS = 12_000;

export type PokeApiErrorKind =
  | 'network'
  | 'timeout'
  | 'http'
  | 'not-found'
  | 'malformed';

export class PokeApiError extends Error {
  readonly kind: PokeApiErrorKind;
  readonly status?: number;
  readonly url: string;

  constructor(
    kind: PokeApiErrorKind,
    message: string,
    url: string,
    status?: number,
  ) {
    super(message);
    this.name = 'PokeApiError';
    this.kind = kind;
    this.url = url;
    if (status !== undefined) this.status = status;
  }

  /** Short, human-readable line shown on the device LCD. */
  get shortMessage(): string {
    switch (this.kind) {
      case 'timeout':
        return 'LINK TIMEOUT — NO RESPONSE FROM POKEAPI';
      case 'network':
        return 'LINK ERROR — CHECK YOUR CONNECTION';
      case 'not-found':
        return 'NO RECORD FOUND IN THIS INDEX';
      case 'malformed':
        return 'CORRUPT DATA RECEIVED';
      default:
        return `SERVER ERROR ${this.status ?? ''}`.trim();
    }
  }
}

export const cache = createResourceCache({
  namespace: CACHE_NAMESPACE,
  ttlMs: CACHE_TTL_MS,
  storage: getBrowserStorage(),
});

export interface FetchJsonOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Skip the cache read (still writes on success when `cache: true`). */
  force?: boolean;
}

const inFlight = new Map<string, Promise<unknown>>();

async function requestJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (signal?.aborted) {
        throw new PokeApiError('network', 'Request cancelled', url);
      }
      if ((error as Error)?.name === 'AbortError') {
        throw new PokeApiError('timeout', `Timed out after ${timeoutMs}ms`, url);
      }
      throw new PokeApiError(
        'network',
        (error as Error)?.message ?? 'Network request failed',
        url,
      );
    }

    if (response.status === 404) {
      throw new PokeApiError('not-found', 'Resource not found', url, 404);
    }
    if (!response.ok) {
      throw new PokeApiError(
        'http',
        `HTTP ${response.status} ${response.statusText}`,
        url,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new PokeApiError('malformed', 'Response was not valid JSON', url);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Cache-aware JSON fetch. Concurrent callers for the same URL share one request.
 */
async function fetchCached<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  if (!options.force) {
    const cached = cache.read<T>(url);
    if (cached !== undefined) return cached;
  }

  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = requestJson<T>(url, options)
    .then((value) => {
      cache.write(url, value);
      return value;
    })
    .finally(() => {
      inFlight.delete(url);
    });

  inFlight.set(url, promise);
  return promise;
}

/** The Generation I index (#001–#151). One request, then cached. */
export async function fetchPokemonIndex(
  options: FetchJsonOptions = {},
): Promise<PokemonListResponse> {
  const url = `${POKEAPI_BASE_URL}/pokemon?limit=${GEN1_COUNT}&offset=0`;
  const data = await fetchCached<PokemonListResponse>(url, options);
  if (!data || !Array.isArray(data.results)) {
    throw new PokeApiError('malformed', 'Index payload missing results', url);
  }
  return data;
}

export function fetchPokemon(
  id: number,
  options: FetchJsonOptions = {},
): Promise<PokemonResponse> {
  return fetchCached<PokemonResponse>(`${POKEAPI_BASE_URL}/pokemon/${id}`, options);
}

export function fetchPokemonSpecies(
  id: number,
  options: FetchJsonOptions = {},
): Promise<PokemonSpeciesResponse> {
  return fetchCached<PokemonSpeciesResponse>(
    `${POKEAPI_BASE_URL}/pokemon-species/${id}`,
    options,
  );
}

export interface PokemonBundle {
  pokemon: PokemonResponse;
  species: PokemonSpeciesResponse;
}

/** Lazy per-Pokémon detail load: both endpoints in parallel, cached per id. */
export function fetchPokemonBundle(
  id: number,
  options: FetchJsonOptions = {},
): Promise<PokemonBundle> {
  return Promise.all([
    fetchPokemon(id, options),
    fetchPokemonSpecies(id, options),
  ]).then(([pokemon, species]) => ({ pokemon, species }));
}

/** Test helper: forget every cached resource. */
export function clearApiCache(): void {
  cache.clear();
  inFlight.clear();
}
