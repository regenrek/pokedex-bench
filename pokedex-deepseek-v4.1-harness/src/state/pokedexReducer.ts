import type { IndexEntry } from '../api/pokeapi';
import { DEX_FIRST_ID, DEX_LAST_ID, type PokemonDetail } from '../domain/pokemon';
import type { SearchOutcome } from '../domain/search';
import { clamp } from '../utils/format';

/** The three interchangeable readouts on the large left-hand LCD. */
export type ViewId = 'species' | 'stats' | 'index';
export const VIEW_ORDER: ViewId[] = ['species', 'stats', 'index'];

export const VIEW_TITLES: Record<ViewId, string> = {
  species: 'SPECIES DATA',
  stats: 'BASE STATS',
  index: 'KANTO INDEX',
};

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PokedexState {
  view: ViewId;
  selectedId: number;
  /** Id currently in flight, or `null` when settled. */
  pendingId: number | null;
  /** Id the user asked for but which failed, used by the retry control. */
  failedId: number | null;

  index: IndexEntry[];
  indexStatus: LoadStatus;

  detail: PokemonDetail | null;
  detailStatus: LoadStatus;
  /** `cache` when the entry was served locally, `network` after a live fetch. */
  source: 'cache' | 'network' | null;
  errorMessage: string | null;

  query: string;
  searchOutcome: SearchOutcome | null;

  /** Digits typed on the physical keypad, rendered as a live entry preview. */
  keypadBuffer: string;
}

export const initialPokedexState: PokedexState = {
  view: 'species',
  selectedId: DEX_FIRST_ID,
  pendingId: DEX_FIRST_ID,
  failedId: null,
  index: [],
  indexStatus: 'loading',
  detail: null,
  detailStatus: 'idle',
  source: null,
  errorMessage: null,
  query: '',
  searchOutcome: null,
  keypadBuffer: '',
};

export type PokedexAction =
  | { type: 'index/loading' }
  | { type: 'index/ready'; index: IndexEntry[] }
  | { type: 'index/error'; message: string }
  | { type: 'select'; id: number; cached: boolean }
  | { type: 'step'; delta: number }
  | { type: 'view'; view: ViewId }
  | { type: 'view/cycle'; delta: number }
  | { type: 'query'; value: string }
  | { type: 'search/outcome'; outcome: SearchOutcome | null }
  | { type: 'keypad/digit'; digit: string }
  | { type: 'keypad/clear' }
  | { type: 'detail/loading'; id: number; cached: boolean }
  | { type: 'detail/ready'; detail: PokemonDetail; cached: boolean }
  | { type: 'detail/error'; message: string; id: number };

export function stepId(id: number, delta: number): number {
  return clamp(id + delta, DEX_FIRST_ID, DEX_LAST_ID);
}

export function cycleView(view: ViewId, delta: number): ViewId {
  const current = VIEW_ORDER.indexOf(view);
  const next = (current + delta + VIEW_ORDER.length) % VIEW_ORDER.length;
  return VIEW_ORDER[next];
}

export function pokedexReducer(state: PokedexState, action: PokedexAction): PokedexState {
  switch (action.type) {
    case 'index/loading':
      return { ...state, indexStatus: 'loading' };

    case 'index/ready':
      return { ...state, index: action.index, indexStatus: 'ready' };

    case 'index/error':
      // A failed index must not take the detail readout down with it: name
      // search degrades to "unavailable", numeric search still works.
      return { ...state, indexStatus: 'error' };

    case 'select': {
      const id = clamp(action.id, DEX_FIRST_ID, DEX_LAST_ID);
      if (id === state.selectedId && state.detailStatus === 'ready') {
        return { ...state, view: state.view === 'index' ? 'species' : state.view };
      }
      return {
        ...state,
        selectedId: id,
        detailStatus: state.detail && state.detail.id === id ? 'ready' : 'loading',
        source: state.detail && state.detail.id === id ? state.source : action.cached ? 'cache' : null,
        pendingId: id,
        failedId: null,
        errorMessage: null,
        view: state.view === 'index' ? 'species' : state.view,
      };
    }

    case 'step':
      return pokedexReducer(state, {
        type: 'select',
        id: stepId(state.selectedId, action.delta),
        cached: false,
      });

    case 'view':
      return { ...state, view: action.view };

    case 'view/cycle':
      return { ...state, view: cycleView(state.view, action.delta) };

    case 'query':
      return { ...state, query: action.value, searchOutcome: null };

    case 'search/outcome':
      return { ...state, searchOutcome: action.outcome };

    case 'keypad/digit': {
      const next = `${state.keypadBuffer}${action.digit}`.replace(/^0+(?=\d)/, '').slice(0, 3);
      return { ...state, keypadBuffer: next };
    }

    case 'keypad/clear':
      return { ...state, keypadBuffer: '' };

    case 'detail/loading':
      return { ...state, detailStatus: 'loading', pendingId: action.id, source: action.cached ? 'cache' : null };

    case 'detail/ready':
      return {
        ...state,
        detail: action.detail,
        detailStatus: 'ready',
        pendingId: null,
        failedId: null,
        errorMessage: null,
        source: action.cached ? 'cache' : 'network',
      };

    case 'detail/error':
      return {
        ...state,
        detailStatus: 'error',
        pendingId: null,
        failedId: action.id,
        errorMessage: action.message,
      };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

/** Short status text for the right-hand marquee strip. */
export function selectStatusLine(state: PokedexState): string {
  if (state.detailStatus === 'error') return 'LINK FAULT — DATA UNAVAILABLE';
  if (state.indexStatus === 'error') return 'INDEX RELAY OFFLINE';
  if (state.detailStatus === 'loading' || state.indexStatus === 'loading') return 'SYNCING WITH RELAY…';
  if (state.source === 'cache') return 'ARCHIVE COPY — OFFLINE READY';
  return 'READY — 151 ENTRIES ON FILE';
}

/** `true` while the device is showing a settled entry that is being replaced. */
export function selectIsRefreshing(state: PokedexState): boolean {
  return state.detailStatus === 'loading' && state.detail !== null && state.detail.id !== state.selectedId;
}

/** `true` only for the very first cold start, when there is nothing to show. */
export function selectIsBooting(state: PokedexState): boolean {
  return state.detail === null && (state.detailStatus === 'idle' || state.detailStatus === 'loading');
}

export function selectKeypadPreview(state: PokedexState): string {
  if (state.keypadBuffer.length === 0) return '';
  const id = Number.parseInt(state.keypadBuffer, 10);
  if (!Number.isFinite(id)) return '';
  if (id < DEX_FIRST_ID || id > DEX_LAST_ID) return `No. ${state.keypadBuffer} — OUT OF RANGE`;
  const entry = state.index.find((item) => item.id === id);
  return `No. ${state.keypadBuffer.padStart(3, '0')} — ${entry ? entry.displayName.toUpperCase() : 'UNKNOWN'}`;
}
