import type { FetchLike } from '../api/client';
import { indexFixtureWithNames, pokemonFixture, speciesFixture } from './fixtures';

export interface FakeRelay {
  fetchImpl: FetchLike;
  /** Every URL requested, in order. */
  requests: string[];
  failMatching(pattern: string | RegExp | null, status?: number): void;
  clearFailures(): void;
  reset(): void;
}

/**
 * In-memory stand-in for the PokéAPI CDN. Exercises the real client,
 * cache and mapping layers while keeping the tests fully offline.
 */
export function createFakeRelay(): FakeRelay {
  const requests: string[] = [];
  let failure: { pattern: string | RegExp | null; status: number } | null = null;

  const fetchImpl: FetchLike = async (url) => {
    requests.push(url);

    if (failure && (failure.pattern === null || matches(url, failure.pattern))) {
      return new Response('relay offline', { status: failure.status });
    }

    if (url.includes('/pokemon?') || /\/pokemon\?/.test(url)) {
      return Response.json(indexFixtureWithNames());
    }

    const speciesMatch = /\/pokemon-species\/(\d+)\/?$/.exec(url);
    if (speciesMatch) {
      return Response.json(speciesFixture(Number(speciesMatch[1])));
    }

    const pokemonMatch = /\/pokemon\/(\d+)\/?$/.exec(url);
    if (pokemonMatch) {
      return Response.json(pokemonFixture(Number(pokemonMatch[1])));
    }

    return new Response('not found', { status: 404 });
  };

  return {
    fetchImpl,
    requests,
    failMatching(pattern, status = 503) {
      failure = { pattern, status };
    },
    clearFailures() {
      failure = null;
    },
    reset() {
      requests.length = 0;
      failure = null;
    },
  };
}

function matches(url: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url);
}
