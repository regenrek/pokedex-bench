/**
 * Memory + localStorage cache with versioned keys, in-flight de-duplication and
 * defensive storage access.
 *
 * Every write is best-effort: private-mode browsers, disabled storage and quota
 * errors all degrade to memory-only caching instead of throwing.
 */

import type { Sourced } from './types'

export const CACHE_VERSION = 'v1'
const PREFIX = `pokedex:${CACHE_VERSION}:`

export const cacheKeys = {
  index: () => `${PREFIX}index`,
  pokemon: (id: number) => `${PREFIX}pokemon:${id}`,
  species: (id: number) => `${PREFIX}species:${id}`,
} as const

type Validator<T> = (value: unknown) => value is T

const memory = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

let storageProbe: Storage | null | undefined

/** localStorage when it is genuinely usable, otherwise null. Probed once. */
function storage(): Storage | null {
  if (storageProbe !== undefined) return storageProbe
  storageProbe = null
  try {
    if (typeof window === 'undefined' || !window.localStorage) return storageProbe
    const probe = `${PREFIX}__probe__`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    storageProbe = window.localStorage
  } catch {
    storageProbe = null
  }
  return storageProbe
}

export function storageAvailable(): boolean {
  return storage() !== null
}

function readStorage<T>(key: string, validate: Validator<T>): T | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!validate(parsed)) {
      // Corrupt or stale-shape entry: drop it rather than trusting it.
      store.removeItem(key)
      return null
    }
    return parsed
  } catch {
    try {
      store.removeItem(key)
    } catch {
      /* ignore */
    }
    return null
  }
}

function writeStorage(key: string, data: unknown): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(data))
  } catch {
    // Quota exceeded or storage revoked mid-session: drop this key, keep going.
    try {
      store.removeItem(key)
    } catch {
      /* ignore */
    }
    storageProbe = null
  }
}

/** Synchronous memory-only peek, used to keep repeated navigation free. */
export function peekMemory<T>(key: string, validate: Validator<T>): T | null {
  const hit = memory.get(key)
  return hit !== undefined && validate(hit) ? hit : null
}

export function putMemory(key: string, data: unknown): void {
  memory.set(key, data)
}

export function dropMemory(key: string): void {
  memory.delete(key)
}

export interface LoadOptions {
  /** Skip every cache layer and refetch (used by CONFIRM → refresh). */
  bypassCache?: boolean
}

/**
 * Read-through cache loader.
 *
 * - memory hit → returned synchronously inside a resolved promise
 * - storage hit → promoted into memory
 * - miss → `loader()` runs; concurrent callers share the same in-flight promise
 */
export function loadCached<T>(
  key: string,
  validate: Validator<T>,
  loader: () => Promise<T>,
  options: LoadOptions = {},
): Promise<Sourced<T>> {
  if (!options.bypassCache) {
    const hit = peekMemory(key, validate)
    if (hit !== null) return Promise.resolve({ data: hit, source: 'memory' })

    const pending = inflight.get(key)
    if (pending) return pending as Promise<Sourced<T>>
  }

  const run = (async (): Promise<Sourced<T>> => {
    if (!options.bypassCache) {
      const stored = readStorage(key, validate)
      if (stored !== null) {
        putMemory(key, stored)
        return { data: stored, source: 'storage' }
      }
    }
    const fresh = await loader()
    putMemory(key, fresh)
    writeStorage(key, fresh)
    return { data: fresh, source: 'network' }
  })()

  let tracked: Promise<Sourced<T>>
  tracked = run.finally(() => {
    if (inflight.get(key) === tracked) inflight.delete(key)
  })
  if (!options.bypassCache) inflight.set(key, tracked)
  return tracked
}

/** Test/utility helper: wipe both cache layers. */
export function clearCache(): void {
  memory.clear()
  inflight.clear()
  storageProbe = undefined
  const store = storage()
  if (!store) return
  try {
    const doomed: string[] = []
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)
      if (key && key.startsWith(PREFIX)) doomed.push(key)
    }
    doomed.forEach((key) => store.removeItem(key))
  } catch {
    /* ignore */
  }
}
