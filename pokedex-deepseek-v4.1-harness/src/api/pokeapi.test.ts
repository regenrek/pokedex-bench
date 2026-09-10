import { describe, expect, it } from 'vitest';
import { ResourceCache } from './cache';
import { PokeApiError } from './errors';
import { createPokedexApi, idFromResourceUrl, inDexRange } from './pokeapi';
import { createFakeRelay } from '../test/fakeRelay';

function buildApi(relay = createFakeRelay()) {
  return {
    relay,
    api: createPokedexApi({
      fetchImpl: relay.fetchImpl,
      cache: new ResourceCache({ storage: null }),
    }),
  };
}

describe('idFromResourceUrl', () => {
  it('extracts the trailing id', () => {
    expect(idFromResourceUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25);
    expect(idFromResourceUrl('https://pokeapi.co/api/v2/pokemon/151')).toBe(151);
  });

  it('returns null for non-numeric resources', () => {
    expect(idFromResourceUrl('https://pokeapi.co/api/v2/pokemon/pikachu')).toBeNull();
  });
});

describe('inDexRange', () => {
  it('accepts only 1…151', () => {
    expect(inDexRange(1)).toBe(true);
    expect(inDexRange(151)).toBe(true);
    expect(inDexRange(0)).toBe(false);
    expect(inDexRange(152)).toBe(false);
  });
});

describe('getIndex', () => {
  it('returns 151 entries sorted by dex number', async () => {
    const { api } = buildApi();
    const index = await api.getIndex();
    expect(index).toHaveLength(151);
    expect(index[0]).toMatchObject({ id: 1, displayName: 'Bulbasaur' });
    expect(index[24]).toMatchObject({ id: 25, displayName: 'Pikachu' });
    expect(index[150]).toMatchObject({ id: 151, displayName: 'Mew' });
  });

  it('requests the list exactly once even across repeated calls', async () => {
    const { api, relay } = buildApi();
    await api.getIndex();
    await api.getIndex();
    await api.getIndex();
    expect(relay.requests.filter((url) => url.includes('/pokemon?'))).toHaveLength(1);
  });
});

describe('getDetail', () => {
  it('maps the Pokémon and species payloads into the view model', async () => {
    const { api } = buildApi();
    const detail = await api.getDetail(1);

    expect(detail).toMatchObject({
      id: 1,
      dexNumber: '001',
      displayName: 'Bulbasaur',
      types: ['grass', 'poison'],
      heightM: 0.7,
      weightKg: 6.9,
      genus: 'Seed Pokémon',
      habitat: 'grassland',
      captureRate: 45,
      isLegendary: false,
    });
    expect(detail.abilities.map((ability) => ability.displayName)).toEqual(['Overgrow', 'Chlorophyll']);
    expect(detail.abilities[1].hidden).toBe(true);
    expect(detail.stats.map((row) => row.value)).toEqual([45, 49, 49, 65, 65, 45]);
    expect(detail.statTotal).toBe(318);
    expect(detail.flavorText).not.toMatch(/[\n\f]/);
    expect(detail.flavorText).toContain('A strange seed was planted on its back at birth.');
  });

  it('caches an entry so a second read makes no network calls', async () => {
    const { api, relay } = buildApi();
    await api.getDetail(25);
    const afterFirst = relay.requests.length;

    const cached = await api.getDetail(25);
    expect(cached.displayName).toBe('Pikachu');
    expect(relay.requests).toHaveLength(afterFirst);
    expect(api.hasDetail(25)).toBe(true);
    expect(api.peekDetail(25)?.dexNumber).toBe('025');
  });

  it('serves repeat visits from a persistent cache shared by new api instances', async () => {
    const relay = createFakeRelay();
    const cache = new ResourceCache({ storage: null });

    const first = createPokedexApi({ fetchImpl: relay.fetchImpl, cache });
    await first.getDetail(151);
    const callsAfterFirst = relay.requests.length;

    // Simulates a page reload: new api object, same persisted cache.
    const second = createPokedexApi({ fetchImpl: relay.fetchImpl, cache });
    const detail = await second.getDetail(151);

    expect(detail.displayName).toBe('Mew');
    expect(relay.requests).toHaveLength(callsAfterFirst);
  });

  it('de-duplicates concurrent requests for the same entry', async () => {
    const { api, relay } = buildApi();
    await Promise.all([api.getDetail(4), api.getDetail(4), api.getDetail(4)]);
    expect(relay.requests.filter((url) => url.endsWith('/pokemon/4'))).toHaveLength(1);
    expect(relay.requests.filter((url) => url.endsWith('/pokemon-species/4'))).toHaveLength(1);
  });

  it('rejects entries outside the Kanto window without touching the network', async () => {
    const { api, relay } = buildApi();
    await expect(api.getDetail(152)).rejects.toBeInstanceOf(PokeApiError);
    expect(relay.requests).toHaveLength(0);
  });

  it('maps a 404 to a not-found error', async () => {
    const { api, relay } = buildApi();
    relay.failMatching('/pokemon/7', 404);
    await expect(api.getDetail(7)).rejects.toMatchObject({ kind: 'not-found', status: 404 });
  });

  it('maps a server fault to an http error and does not cache it', async () => {
    const { api, relay } = buildApi();
    relay.failMatching(null, 503);
    await expect(api.getDetail(3)).rejects.toMatchObject({ kind: 'http', status: 503 });
    expect(api.hasDetail(3)).toBe(false);
  });

  it('surfaces transport failures as network errors', async () => {
    const cache = new ResourceCache({ storage: null });
    const api = createPokedexApi({
      fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')),
      cache,
    });
    const error = await api.getDetail(1).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PokeApiError);
    expect((error as PokeApiError).userMessage).toBe('NO SIGNAL FROM RELAY');
  });

  it('lets the caller retry successfully after a fault', async () => {
    const { api, relay } = buildApi();
    relay.failMatching(null, 500);
    await expect(api.getDetail(1)).rejects.toBeInstanceOf(PokeApiError);

    relay.clearFailures();
    await expect(api.getDetail(1)).resolves.toMatchObject({ displayName: 'Bulbasaur' });
  });
});
