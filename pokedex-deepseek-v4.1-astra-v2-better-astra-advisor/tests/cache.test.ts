import { describe, expect, it, vi } from 'vitest';
import { createResourceCache, type CacheStorage } from '../src/api/cache';

function memoryStorage(): CacheStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

describe('resource cache', () => {
  it('serves a value from the in-memory tier', () => {
    const cache = createResourceCache({ namespace: 'test-memory', ttlMs: 1000 });
    cache.write('a', { value: 1 });
    expect(cache.read<{ value: number }>('a')).toEqual({ value: 1 });
    expect(cache.has('a')).toBe(true);
  });

  it('falls back to persistent storage after a memory miss', () => {
    const storage = memoryStorage();
    const first = createResourceCache({
      namespace: 'test-persist',
      ttlMs: 1000,
      storage,
    });
    first.write('k', 42);
    expect(Object.keys(storage.dump())).toContain('test-persist:k');

    // Simulate a fresh session: a new cache instance, same storage.
    const second = createResourceCache({
      namespace: 'test-persist-2',
      ttlMs: 1000,
      storage: {
        ...storage,
        getItem: (key) => storage.getItem(key.replace('test-persist-2:', 'test-persist:')),
        setItem: (key, value) => storage.setItem(key.replace('test-persist-2:', 'test-persist:'), value),
        removeItem: (key) => storage.removeItem(key.replace('test-persist-2:', 'test-persist:')),
      },
    });
    expect(second.read<number>('k')).toBe(42);
  });

  it('expires entries once the TTL has passed', () => {
    let now = 1_000;
    const cache = createResourceCache({
      namespace: 'test-ttl',
      ttlMs: 500,
      now: () => now,
    });
    cache.write('k', 'v');
    expect(cache.read('k')).toBe('v');
    now = 1_600;
    expect(cache.read('k')).toBeUndefined();
  });

  it('ignores corrupt persisted payloads', () => {
    const storage = memoryStorage();
    storage.setItem('test-corrupt:k', '{not json');
    const cache = createResourceCache({
      namespace: 'test-corrupt',
      ttlMs: 5000,
      storage,
    });
    expect(cache.read('k')).toBeUndefined();
    expect(storage.getItem('test-corrupt:k')).toBeNull();
  });

  it('survives storage that throws on write', () => {
    const storage: CacheStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => undefined,
    };
    const cache = createResourceCache({ namespace: 'test-quota', ttlMs: 5000, storage });
    expect(() => cache.write('k', 'v')).not.toThrow();
    expect(cache.read('k')).toBe('v');
  });

  it('clears every entry for its namespace', () => {
    const cache = createResourceCache({ namespace: 'test-clear', ttlMs: 5000 });
    cache.write('a', 1);
    cache.write('b', 2);
    cache.clear();
    expect(cache.read('a')).toBeUndefined();
    expect(cache.size()).toBe(0);
    vi.restoreAllMocks();
  });
});
