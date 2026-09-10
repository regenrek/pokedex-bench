import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PokeApiError, describeError } from '../api/errors';
import type { PokedexApi } from '../api/pokeapi';
import { DEX_FIRST_ID, DEX_LAST_ID } from '../domain/pokemon';
import { resolveSearch } from '../domain/search';
import { PokedexContext, type PokedexController } from './pokedexContext';
import {
  initialPokedexState,
  pokedexReducer,
  selectIsBooting,
  selectIsRefreshing,
  selectKeypadPreview,
  selectStatusLine,
  type ViewId,
} from './pokedexReducer';

export interface PokedexProviderProps {
  api: PokedexApi;
  children: ReactNode;
}

export function PokedexProvider({ api, children }: PokedexProviderProps) {
  const [state, dispatch] = useReducer(pokedexReducer, initialPokedexState);
  const [linkActive, setLinkActive] = useState(false);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedId = state.selectedId;

  /* Link activity lamp: lights for a moment on every outgoing request. */
  useEffect(() => {
    return api.onRequest(() => {
      setLinkActive(true);
      if (linkTimer.current) clearTimeout(linkTimer.current);
      linkTimer.current = setTimeout(() => setLinkActive(false), 900);
    });
  }, [api]);

  useEffect(() => {
    return () => {
      if (linkTimer.current) clearTimeout(linkTimer.current);
    };
  }, []);

  /* The 151-entry index: one request, shared by search and the index view. */
  useEffect(() => {
    let cancelled = false;
    api
      .getIndex()
      .then((index) => {
        if (!cancelled) dispatch({ type: 'index/ready', index });
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof PokeApiError && error.isAbort)) return;
        dispatch({ type: 'index/error', message: describeError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  /* Detail loading, with a synchronous cache peek so cached entries never flash. */
  useEffect(() => {
    const peeked = api.peekDetail(selectedId);
    if (peeked) {
      dispatch({ type: 'detail/ready', detail: peeked, cached: true });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'detail/loading', id: selectedId, cached: false });
    api
      .getDetail(selectedId)
      .then((detail) => {
        if (!cancelled) dispatch({ type: 'detail/ready', detail, cached: false });
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof PokeApiError && error.isAbort)) return;
        dispatch({ type: 'detail/error', message: describeError(error), id: selectedId });
      });

    return () => {
      cancelled = true;
    };
  }, [api, selectedId]);

  const select = useCallback(
    (id: number) => dispatch({ type: 'select', id, cached: api.hasDetail(id) }),
    [api],
  );
  const next = useCallback(() => dispatch({ type: 'step', delta: 1 }), []);
  const previous = useCallback(() => dispatch({ type: 'step', delta: -1 }), []);
  const setView = useCallback((view: ViewId) => dispatch({ type: 'view', view }), []);
  const cycleView = useCallback((delta: number) => dispatch({ type: 'view/cycle', delta }), []);
  const setQuery = useCallback((value: string) => dispatch({ type: 'query', value }), []);
  const pressDigit = useCallback((digit: string) => dispatch({ type: 'keypad/digit', digit }), []);
  const clearKeypad = useCallback(() => dispatch({ type: 'keypad/clear' }), []);

  const index = state.index;
  const query = state.query;

  const submitSearch = useCallback(() => {
    const outcome = resolveSearch(query, index);
    dispatch({ type: 'search/outcome', outcome });
    if (outcome.status === 'match') select(outcome.id);
  }, [index, query, select]);

  const confirmKeypad = useCallback(() => {
    const buffer = state.keypadBuffer;
    if (buffer.length === 0) return;
    const id = Number.parseInt(buffer, 10);
    dispatch({ type: 'keypad/clear' });
    if (!Number.isFinite(id) || id < DEX_FIRST_ID || id > DEX_LAST_ID) {
      dispatch({
        type: 'search/outcome',
        outcome: { status: 'out-of-range', id: Number.isFinite(id) ? id : 0 },
      });
      return;
    }
    dispatch({ type: 'search/outcome', outcome: null });
    select(id);
  }, [select, state.keypadBuffer]);

  const retry = useCallback(() => {
    const target = state.failedId ?? state.selectedId;
    dispatch({ type: 'detail/loading', id: target, cached: api.hasDetail(target) });
    api
      .getDetail(target)
      .then((detail) => dispatch({ type: 'detail/ready', detail, cached: false }))
      .catch((error: unknown) => {
        if (error instanceof PokeApiError && error.isAbort) return;
        dispatch({ type: 'detail/error', message: describeError(error), id: target });
      });
  }, [api, state.failedId, state.selectedId]);

  const value = useMemo<PokedexController>(
    () => ({
      state,
      isBooting: selectIsBooting(state),
      isRefreshing: selectIsRefreshing(state),
      statusLine: selectStatusLine(state),
      keypadPreview: selectKeypadPreview(state),
      searchOutcome: state.searchOutcome,
      linkActive,
      select,
      next,
      previous,
      setView,
      cycleView,
      setQuery,
      submitSearch,
      pressDigit,
      clearKeypad,
      confirmKeypad,
      retry,
    }),
    [
      state,
      linkActive,
      select,
      next,
      previous,
      setView,
      cycleView,
      setQuery,
      submitSearch,
      pressDigit,
      clearKeypad,
      confirmKeypad,
      retry,
    ],
  );

  return <PokedexContext.Provider value={value}>{children}</PokedexContext.Provider>;
}

