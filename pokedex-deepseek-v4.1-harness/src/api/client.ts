import { PokeApiError, toPokeApiError } from './errors';

export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
export const REQUEST_TIMEOUT_MS = 12_000;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchJsonOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

/**
 * Single choke-point for every network call: applies a timeout, normalises all
 * failure modes into `PokeApiError`, and never lets a raw `TypeError: Failed to
 * fetch` reach a component.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { signal, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);

  if (typeof fetchImpl !== 'function') {
    throw new PokeApiError('network', 'Fetch is not available in this environment');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
  const onOuterAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    if (signal?.aborted) throw new PokeApiError('aborted', 'Request aborted before start');

    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const kind = response.status === 404 ? 'not-found' : 'http';
      throw new PokeApiError(kind, `PokéAPI responded ${response.status} for ${url}`, {
        status: response.status,
      });
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new PokeApiError('parse', `Malformed JSON from ${url}`, { cause, status: response.status });
    }
  } catch (error) {
    if (signal?.aborted) throw new PokeApiError('aborted', 'Request aborted');
    throw toPokeApiError(error);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}
