/** Fetch stub that serves PokéAPI-shaped fixtures and records every call. */
import { vi } from 'vitest';
import { indexPayload, pokemonPayload, speciesPayload } from './fixtures';

export type UrlPattern = string | RegExp;

export interface FetchMock {
  calls: string[];
  /** Number of requests made for a given URL fragment. */
  count: (pattern: UrlPattern) => number;
  /** Make every subsequent matching request fail with an HTTP status. */
  failNext: (pattern: UrlPattern, status?: number) => void;
  /** Make every subsequent matching request reject as a network error. */
  breakNext: (pattern: UrlPattern) => void;
  /** Stop failing matching requests. */
  recover: (pattern?: UrlPattern) => void;
  restore: () => void;
}

/** Strings match by substring; regular expressions match the full URL. */
export function matchesPattern(url: string, pattern: UrlPattern): boolean {
  return typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url);
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

export function installFetchMock(): FetchMock {
  const calls: string[] = [];
  const failing = new Map<UrlPattern, number>();
  const broken = new Set<UrlPattern>();

  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : String(input);
    calls.push(url);

    for (const pattern of broken) {
      if (matchesPattern(url, pattern)) {
        throw new TypeError('Failed to fetch');
      }
    }
    for (const [pattern, status] of failing) {
      if (matchesPattern(url, pattern)) {
        return jsonResponse({ detail: 'Not found' }, status);
      }
    }

    const indexMatch = /\/pokemon\?limit=(\d+)&offset=(\d+)$/.exec(url);
    if (indexMatch) return jsonResponse(indexPayload());

    const speciesMatch = /\/pokemon-species\/(\d+)\/?$/.exec(url);
    if (speciesMatch) {
      const id = Number.parseInt(speciesMatch[1]!, 10);
      if (id < 1 || id > 151) return jsonResponse({ detail: 'Not Found' }, 404);
      return jsonResponse(speciesPayload(id));
    }

    const pokemonMatch = /\/pokemon\/(\d+)\/?$/.exec(url);
    if (pokemonMatch) {
      const id = Number.parseInt(pokemonMatch[1]!, 10);
      if (id < 1 || id > 151) return jsonResponse({ detail: 'Not Found' }, 404);
      if (id === 25) {
        return jsonResponse(
          pokemonPayload(25, {
            name: 'pikachu',
            height: 4,
            weight: 60,
            types: ['electric'],
            abilities: [{ name: 'static' }, { name: 'lightning-rod', hidden: true }],
            stats: [35, 55, 40, 50, 50, 90],
          }),
        );
      }
      return jsonResponse(pokemonPayload(id));
    }

    return jsonResponse({ detail: 'Not Found' }, 404);
  });

  vi.stubGlobal('fetch', impl);

  return {
    calls,
    count: (pattern: UrlPattern) =>
      calls.filter((url) => matchesPattern(url, pattern)).length,
    failNext: (pattern: UrlPattern, status = 500) => {
      failing.set(pattern, status);
    },
    breakNext: (pattern: UrlPattern) => {
      broken.add(pattern);
    },
    recover: (pattern?: UrlPattern) => {
      if (pattern) {
        failing.delete(pattern);
        broken.delete(pattern);
        return;
      }
      failing.clear();
      broken.clear();
    },
    restore: () => {
      vi.unstubAllGlobals();
    },
  };
}
