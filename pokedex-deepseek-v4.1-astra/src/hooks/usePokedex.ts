/**
 * The device state machine: index list, selection, lazy detail loading and
 * search. Components stay presentational and read everything from here.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { toDisplayMessage } from '../api/client'
import { fetchDetail, fetchIndex, KANTO_LIMIT } from '../api/pokeapi'
import type { CacheSource, IndexEntry, PokedexView, PokemonDetail } from '../api/types'
import { clampDexId, resolveSearch } from '../lib/search'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface DetailRequest {
  /** the entry the device is currently on; committed as soon as it is picked */
  id: number
  /** bumped for every fetch, so Retry / CONFIRM can re-run the same id */
  token: number
  /** true when the request must ignore every cache layer */
  force: boolean
}

interface State {
  entries: IndexEntry[]
  listStatus: LoadStatus
  listError: string | null

  request: DetailRequest

  detail: PokemonDetail | null
  detailStatus: LoadStatus
  detailError: string | null
  source: CacheSource | null

  view: PokedexView
  query: string
  searchError: string | null
}

type Action =
  | { type: 'list/loading' }
  | { type: 'list/ready'; entries: IndexEntry[] }
  | { type: 'list/error'; message: string }
  | { type: 'nav/select'; id: number; force?: boolean }
  | { type: 'nav/step'; delta: number }
  | { type: 'nav/reload'; force: boolean }
  | { type: 'detail/ready'; id: number; detail: PokemonDetail; source: CacheSource }
  | { type: 'detail/error'; id: number; message: string }
  | { type: 'view/set'; view: PokedexView }
  | { type: 'search/query'; query: string }
  | { type: 'search/error'; message: string | null }

const initialState: State = {
  entries: [],
  listStatus: 'loading',
  listError: null,
  request: { id: 1, token: 0, force: false },
  detail: null,
  detailStatus: 'loading',
  detailError: null,
  source: null,
  view: 'data',
  query: '',
  searchError: null,
}

function beginLoad(state: State, id: number, force: boolean): State {
  const target = clampDexId(id)
  if (!force && target === state.request.id && state.detailStatus === 'ready') return state
  return {
    ...state,
    request: { id: target, token: state.request.token + 1, force },
    detailStatus: 'loading',
    detailError: null,
    source: null,
    searchError: null,
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'list/loading':
      return { ...state, listStatus: 'loading', listError: null }

    case 'list/ready':
      return { ...state, entries: action.entries, listStatus: 'ready', listError: null }

    case 'list/error':
      return { ...state, listStatus: 'error', listError: action.message }

    case 'nav/select':
      return beginLoad(state, action.id, action.force ?? false)

    case 'nav/step': {
      // ±10 jumps clamp into 001–151 rather than refusing to move.
      const next = clampDexId(state.request.id + action.delta)
      if (next === state.request.id) {
        // Clamped: never leave the 001–151 window, but do allow a retry after a fault.
        if (state.detailStatus === 'error') {
          return {
            ...state,
            request: { ...state.request, token: state.request.token + 1, force: false },
            detailStatus: 'loading',
            detailError: null,
          }
        }
        return state
      }
      return beginLoad(state, next, false)
    }

    case 'nav/reload':
      return {
        ...state,
        request: { ...state.request, token: state.request.token + 1, force: action.force },
        detailStatus: 'loading',
        detailError: null,
        searchError: null,
      }

    case 'detail/ready':
      // Stale responses are dropped: only the newest request may commit.
      if (action.id !== state.request.id) return state
      return {
        ...state,
        detail: action.detail,
        detailStatus: 'ready',
        detailError: null,
        source: action.source,
      }

    case 'detail/error':
      if (action.id !== state.request.id) return state
      return {
        ...state,
        detailStatus: 'error',
        detailError: action.message,
        source: null,
      }

    case 'view/set':
      return { ...state, view: action.view }

    case 'search/query':
      return { ...state, query: action.query, searchError: null }

    case 'search/error':
      return { ...state, searchError: action.message }

    default:
      return state
  }
}

export interface PokedexController {
  entries: IndexEntry[]
  listStatus: LoadStatus
  listError: string | null
  entryById: Map<number, IndexEntry>

  /** the entry the device is on — committed immediately, detail may lag behind */
  selectedId: number
  detail: PokemonDetail | null
  detailStatus: LoadStatus
  detailError: string | null
  source: CacheSource | null
  isNavigating: boolean
  canPrev: boolean
  canNext: boolean

  view: PokedexView
  setView: (view: PokedexView) => void

  query: string
  searchError: string | null
  setQuery: (value: string) => void
  submitSearch: () => void
  clearSearch: () => void

  select: (id: number) => void
  step: (delta: number) => void
  first: () => void
  last: () => void
  retry: () => void
  refresh: () => void
  retryList: () => void
}

export function usePokedex(): PokedexController {
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadList = useCallback(() => {
    dispatch({ type: 'list/loading' })
    fetchIndex()
      .then((result) => dispatch({ type: 'list/ready', entries: result.data }))
      .catch((error: unknown) => dispatch({ type: 'list/error', message: toDisplayMessage(error) }))
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // A new `request` object is issued for every fetch, so the effect re-runs for a
  // fresh selection, a Retry and a CONFIRM refresh alike.
  const { request } = state

  useEffect(() => {
    let cancelled = false
    fetchDetail(request.id, { bypassCache: request.force })
      .then((result) => {
        if (!cancelled && alive.current) {
          dispatch({ type: 'detail/ready', id: request.id, detail: result.data, source: result.source })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && alive.current) {
          dispatch({ type: 'detail/error', id: request.id, message: toDisplayMessage(error) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [request])

  const entryById = useMemo(() => {
    const map = new Map<number, IndexEntry>()
    state.entries.forEach((entry) => map.set(entry.id, entry))
    return map
  }, [state.entries])

  const select = useCallback((id: number) => dispatch({ type: 'nav/select', id }), [])
  const step = useCallback((delta: number) => dispatch({ type: 'nav/step', delta }), [])
  const first = useCallback(() => dispatch({ type: 'nav/select', id: 1 }), [])
  const last = useCallback(() => dispatch({ type: 'nav/select', id: KANTO_LIMIT }), [])
  const retry = useCallback(() => dispatch({ type: 'nav/reload', force: false }), [])
  const refresh = useCallback(() => dispatch({ type: 'nav/reload', force: true }), [])
  const setView = useCallback((view: PokedexView) => dispatch({ type: 'view/set', view }), [])
  const setQuery = useCallback((query: string) => dispatch({ type: 'search/query', query }), [])
  const clearSearch = useCallback(() => dispatch({ type: 'search/query', query: '' }), [])

  const submitSearch = useCallback(() => {
    const result = resolveSearch(state.query, state.entries)
    if (!result.ok) {
      // Invalid input never disturbs the entry currently on screen.
      dispatch({ type: 'search/error', message: result.message })
      return
    }
    dispatch({ type: 'nav/select', id: result.id })
  }, [state.query, state.entries])

  return {
    entries: state.entries,
    listStatus: state.listStatus,
    listError: state.listError,
    entryById,
    selectedId: state.request.id,
    detail: state.detail,
    detailStatus: state.detailStatus,
    detailError: state.detailError,
    source: state.source,
    isNavigating: state.detailStatus === 'loading' && state.detail !== null,
    canPrev: state.request.id > 1,
    canNext: state.request.id < KANTO_LIMIT,
    view: state.view,
    setView,
    query: state.query,
    searchError: state.searchError,
    setQuery,
    submitSearch,
    clearSearch,
    select,
    step,
    first,
    last,
    retry,
    refresh,
    retryList: loadList,
  }
}
