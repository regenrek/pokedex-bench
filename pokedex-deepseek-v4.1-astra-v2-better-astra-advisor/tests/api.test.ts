import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PokeApiError,
  clearApiCache,
  fetchPokemon,
  fetchPokemonBundle,
  fetchPokemonIndex,
} from '../src/api/pokeapi';
import { installFetchMock, type FetchMock } from './fetchMock';

let mock: FetchMock;

beforeEach(() => {
  clearApiCache();
  mock = installFetchMock();
});

afterEach(() => {
  mock.restore();
  clearApiCache();
});

const exact = (fragment: string) => (url: string) => url.endsWith(fragment);

describe('PokéAPI data layer', () => {
  it('loads the Generation I index with one request', async () => {
    const index = await fetchPokemonIndex();
    expect(index.results).toHaveLength(151);
    expect(mock.count('pokemon?limit=151&offset=0')).toBe(1);
  });

  it('reuses the cache for repeated index loads', async () => {
    await fetchPokemonIndex();
    await fetchPokemonIndex();
    expect(mock.count('pokemon?limit=151&offset=0')).toBe(1);
  });

  it('loads a Pokémon and its species record in parallel', async () => {
    const bundle = await fetchPokemonBundle(1);
    expect(bundle.pokemon.name).toBe('bulbasaur');
    expect(bundle.pokemon.height).toBe(7);
    expect(bundle.species.genera[0]?.genus).toBe('Seed Pokémon');
    expect(mock.calls.filter(exact('/pokemon/1'))).toHaveLength(1);
    expect(mock.calls.filter(exact('/pokemon-species/1'))).toHaveLength(1);
  });

  it('does not refetch a Pokémon that is already cached', async () => {
    await fetchPokemon(25);
    await fetchPokemon(25);
    await fetchPokemonBundle(25);
    expect(mock.calls.filter(exact('/pokemon/25'))).toHaveLength(1);
  });

  it('deduplicates concurrent requests for the same resource', async () => {
    await Promise.all([fetchPokemon(4), fetchPokemon(4), fetchPokemon(4)]);
    expect(mock.calls.filter(exact('/pokemon/4'))).toHaveLength(1);
  });

  it('maps HTTP 404 to a not-found error', async () => {
    mock.failNext(/\/pokemon\/999$/, 404);
    await expect(fetchPokemon(999)).rejects.toMatchObject({
      name: 'PokeApiError',
      kind: 'not-found',
      status: 404,
    });
  });

  it('maps HTTP 500 to an http error with a device message', async () => {
    mock.failNext(/\/pokemon\/7$/, 500);
    const error = await fetchPokemon(7).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(PokeApiError);
    expect((error as PokeApiError).kind).toBe('http');
    expect((error as PokeApiError).shortMessage).toContain('500');
  });

  it('maps a network failure to a recoverable error', async () => {
    mock.breakNext(/\/pokemon\/9$/);
    const error = await fetchPokemon(9).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(PokeApiError);
    expect((error as PokeApiError).kind).toBe('network');
    expect((error as PokeApiError).shortMessage).toContain('LINK ERROR');
  });

  it('rejects a malformed index payload', async () => {
    clearApiCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ nope: true }),
          }) as unknown as Response,
      ),
    );
    await expect(fetchPokemonIndex()).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('recovers after a transient failure once the API is reachable again', async () => {
    mock.breakNext(/\/pokemon\/12$/);
    await expect(fetchPokemon(12)).rejects.toBeInstanceOf(PokeApiError);
    mock.recover();
    const recovered = await fetchPokemon(12);
    expect(recovered.id).toBe(12);
  });
});
