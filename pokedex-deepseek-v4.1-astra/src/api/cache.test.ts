import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CACHE_VERSION,
  cacheKeys,
  clearCache,
  dropMemory,
  loadCached,
  peekMemory,
  putMemory,
  storageAvailable,
} from './cache'

interface Shape {
  id: number
  name: string
}

const isShape = (value: unknown): value is Shape => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Shape>
  return typeof candidate.id === 'number' && typeof candidate.name === 'string'
}

const KEY = cacheKeys.pokemon(1)

function deferred<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

beforeEach(() => {
  clearCache()
  localStorage.clear()
})

describe('cache keys', () => {
  it('are versioned', () => {
    expect(CACHE_VERSION).toBe('v1')
    expect(cacheKeys.index()).toBe('pokedex:v1:index')
    expect(cacheKeys.pokemon(25)).toBe('pokedex:v1:pokemon:25')
    expect(cacheKeys.species(25)).toBe('pokedex:v1:species:25')
  })
})

describe('loadCached', () => {
  it('serves repeat reads from memory without calling the loader again', async () => {
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))

    const first = await loadCached(KEY, isShape, loader)
    const second = await loadCached(KEY, isShape, loader)

    expect(first.source).toBe('network')
    expect(second).toEqual({ data: { id: 1, name: 'bulbasaur' }, source: 'memory' })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('promotes a persisted entry back into memory', async () => {
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))
    await loadCached(KEY, isShape, loader)
    dropMemory(KEY)

    const restored = await loadCached(KEY, isShape, loader)

    expect(restored.source).toBe('storage')
    expect(loader).toHaveBeenCalledTimes(1)
    expect(peekMemory(KEY, isShape)).toEqual({ id: 1, name: 'bulbasaur' })
  })

  it('ignores unreadable cache entries and refetches', async () => {
    localStorage.setItem(KEY, '{{{ not json')
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))

    const result = await loadCached(KEY, isShape, loader)

    expect(result.source).toBe('network')
    expect(loader).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ id: 1, name: 'bulbasaur' }))
  })

  it('rejects cache entries with the wrong shape', async () => {
    localStorage.setItem(KEY, JSON.stringify({ id: 'one', name: 2 }))
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))

    const result = await loadCached(KEY, isShape, loader)

    expect(result.source).toBe('network')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('de-duplicates concurrent requests for the same key', async () => {
    const loader = vi.fn(() => deferred({ id: 1, name: 'bulbasaur' }, 20))

    const [a, b] = await Promise.all([
      loadCached(KEY, isShape, loader),
      loadCached(KEY, isShape, loader),
    ])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(a.source).toBe('network')
  })

  it('bypasses both cache layers when asked', async () => {
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))
    await loadCached(KEY, isShape, loader)

    const forced = await loadCached(KEY, isShape, loader, { bypassCache: true })

    expect(forced.source).toBe('network')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('survives a storage read that throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))

    const result = await loadCached(KEY, isShape, loader)

    expect(result.source).toBe('network')
    spy.mockRestore()
  })

  it('survives a quota error while writing', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const loader = vi.fn(async () => ({ id: 1, name: 'bulbasaur' }))

    const result = await loadCached(KEY, isShape, loader)

    expect(result.data).toEqual({ id: 1, name: 'bulbasaur' })
    expect(storageAvailable()).toBe(false)
    spy.mockRestore()
  })
})

describe('memory helpers', () => {
  it('only return values that pass validation', () => {
    putMemory(KEY, { id: 1, name: 'bulbasaur' })
    expect(peekMemory(KEY, isShape)).toEqual({ id: 1, name: 'bulbasaur' })

    putMemory(KEY, { id: 'nope' })
    expect(peekMemory(KEY, isShape)).toBeNull()
  })
})
