import { describe, expect, it } from 'vitest';
import { toPokemonDetail } from '../domain/pokemon';
import { BULBASAUR_POKEMON, BULBASAUR_SPECIES, PIKACHU_POKEMON, PIKACHU_SPECIES } from '../test/fixtures';
import {
  cycleView,
  initialPokedexState,
  pokedexReducer,
  selectIsBooting,
  selectIsRefreshing,
  selectKeypadPreview,
  selectStatusLine,
  stepId,
  type PokedexState,
} from './pokedexReducer';

const bulbasaur = toPokemonDetail(BULBASAUR_POKEMON, BULBASAUR_SPECIES);
const pikachu = toPokemonDetail(PIKACHU_POKEMON, PIKACHU_SPECIES);

function readyState(): PokedexState {
  const withDetail = pokedexReducer(
    { ...initialPokedexState, pendingId: null },
    { type: 'detail/ready', detail: bulbasaur, cached: false },
  );
  return pokedexReducer(withDetail, {
    type: 'index/ready',
    index: [{ id: 1, slug: 'bulbasaur', displayName: 'Bulbasaur' }],
  });
}

describe('stepId', () => {
  it('clamps at the lower bound', () => {
    expect(stepId(1, -1)).toBe(1);
    expect(stepId(2, -1)).toBe(1);
  });

  it('clamps at the upper bound', () => {
    expect(stepId(151, 1)).toBe(151);
    expect(stepId(150, 1)).toBe(151);
  });

  it('steps normally in the middle', () => {
    expect(stepId(25, 1)).toBe(26);
    expect(stepId(25, -1)).toBe(24);
  });
});

describe('cycleView', () => {
  it('wraps forwards and backwards', () => {
    expect(cycleView('species', 1)).toBe('stats');
    expect(cycleView('stats', 1)).toBe('index');
    expect(cycleView('index', 1)).toBe('species');
    expect(cycleView('species', -1)).toBe('index');
  });
});

describe('pokedexReducer', () => {
  it('starts booting on entry 1', () => {
    expect(initialPokedexState.selectedId).toBe(1);
    expect(initialPokedexState.view).toBe('species');
    expect(selectIsBooting(initialPokedexState)).toBe(true);
  });

  it('clamps selection to the Kanto window', () => {
    const low = pokedexReducer(readyState(), { type: 'select', id: 0, cached: false });
    expect(low.selectedId).toBe(1);
    const high = pokedexReducer(readyState(), { type: 'select', id: 900, cached: false });
    expect(high.selectedId).toBe(151);
  });

  it('marks cached selections so the readout can show the archive chip', () => {
    const next = pokedexReducer(readyState(), { type: 'select', id: 25, cached: true });
    expect(next.source).toBe('cache');
    expect(next.detailStatus).toBe('loading');
  });

  it('keeps the previous entry on screen while a new one loads', () => {
    const next = pokedexReducer(readyState(), { type: 'select', id: 25, cached: false });
    expect(next.detail).toBe(bulbasaur);
    expect(selectIsRefreshing(next)).toBe(true);
  });

  it('does not flash a loading state when re-selecting the visible entry', () => {
    const next = pokedexReducer(readyState(), { type: 'select', id: 1, cached: true });
    expect(next.detailStatus).toBe('ready');
  });

  it('returns to the species screen when picking from the index', () => {
    const browsing = pokedexReducer(readyState(), { type: 'view', view: 'index' });
    const picked = pokedexReducer(browsing, { type: 'select', id: 25, cached: true });
    expect(picked.view).toBe('species');
  });

  it('records the failing entry so retry targets it', () => {
    const failed = pokedexReducer(readyState(), {
      type: 'detail/error',
      message: 'NO SIGNAL FROM RELAY',
      id: 25,
    });
    expect(failed.detailStatus).toBe('error');
    expect(failed.failedId).toBe(25);
    expect(failed.detail).toBe(bulbasaur);
    expect(selectIsRefreshing(failed)).toBe(false);
  });

  it('recovers to a ready state after a successful retry', () => {
    const failed = pokedexReducer(readyState(), {
      type: 'detail/error',
      message: 'NO SIGNAL FROM RELAY',
      id: 25,
    });
    const recovered = pokedexReducer(failed, { type: 'detail/ready', detail: pikachu, cached: false });
    expect(recovered.detailStatus).toBe('ready');
    expect(recovered.failedId).toBeNull();
    expect(recovered.detail?.displayName).toBe('Pikachu');
  });

  it('builds a three-digit keypad buffer and ignores extra digits', () => {
    let state = readyState();
    state = pokedexReducer(state, { type: 'keypad/digit', digit: '0' });
    state = pokedexReducer(state, { type: 'keypad/digit', digit: '2' });
    state = pokedexReducer(state, { type: 'keypad/digit', digit: '5' });
    expect(state.keypadBuffer).toBe('25');
    state = pokedexReducer(state, { type: 'keypad/digit', digit: '9' });
    expect(state.keypadBuffer).toBe('259');
    state = pokedexReducer(state, { type: 'keypad/clear' });
    expect(state.keypadBuffer).toBe('');
  });

  it('keeps the index usable when the list request fails', () => {
    const failed = pokedexReducer(readyState(), { type: 'index/error', message: 'offline' });
    expect(failed.indexStatus).toBe('error');
    expect(failed.detail).toBe(bulbasaur);
  });
});

describe('selectors', () => {
  it('describes the current link state', () => {
    expect(selectStatusLine(readyState())).toBe('READY — 151 ENTRIES ON FILE');
    const fromCache = pokedexReducer(readyState(), { type: 'detail/ready', detail: pikachu, cached: true });
    expect(selectStatusLine(fromCache)).toBe('ARCHIVE COPY — OFFLINE READY');
    const broken = pokedexReducer(readyState(), { type: 'detail/error', message: 'x', id: 25 });
    expect(selectStatusLine(broken)).toBe('LINK FAULT — DATA UNAVAILABLE');
  });

  it('previews the typed dex number', () => {
    const withIndex = pokedexReducer(readyState(), {
      type: 'index/ready',
      index: [{ id: 25, slug: 'pikachu', displayName: 'Pikachu' }],
    });
    expect(selectKeypadPreview(withIndex)).toBe('');
    const typed = pokedexReducer(withIndex, { type: 'keypad/digit', digit: '2' });
    expect(selectKeypadPreview(typed)).toBe('No. 002 — UNKNOWN');
    const typedFull = pokedexReducer(typed, { type: 'keypad/digit', digit: '5' });
    expect(selectKeypadPreview(typedFull)).toBe('No. 025 — PIKACHU');
    const typedFar = pokedexReducer(typedFull, { type: 'keypad/digit', digit: '9' });
    expect(selectKeypadPreview(typedFar)).toBe('No. 259 — OUT OF RANGE');
  });
});
