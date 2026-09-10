/**
 * Small typed resource cache with an in-memory tier and an optional
 * `localStorage` tier, so repeated navigation does not re-hit the network.
 */

export interface CacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Optional enumeration support, used to clear a whole namespace. */
  readonly length?: number;
  key?(index: number): string | null;
}

export interface ResourceCacheOptions {
  namespace: string;
  ttlMs: number;
  storage?: CacheStorage | null;
  now?: () => number;
}

interface CacheEnvelope<T> {
  value: T;
  storedAt: number;
}

export interface ResourceCache {
  read<T>(key: string): T | undefined;
  write<T>(key: string, value: T): void;
  has(key: string): boolean;
  clear(): void;
  /** Test/diagnostic helper: number of in-memory entries. */
  size(): number;
}

const memoryStores = new Map<string, Map<string, CacheEnvelope<unknown>>>();

function memoryStore(namespace: string): Map<string, CacheEnvelope<unknown>> {
  let store = memoryStores.get(namespace);
  if (!store) {
    store = new Map();
    memoryStores.set(namespace, store);
  }
  return store;
}

export function createResourceCache(options: ResourceCacheOptions): ResourceCache {
  const { namespace, ttlMs, storage = null, now = () => Date.now() } = options;
  const memory = memoryStore(namespace);
  const prefix = `${namespace}:`;

  const readPersisted = <T,>(key: string): CacheEnvelope<T> | undefined => {
    if (!storage) return undefined;
    try {
      const raw = storage.getItem(prefix + key);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof parsed.storedAt !== 'number' ||
        !('value' in parsed)
      ) {
        storage.removeItem(prefix + key);
        return undefined;
      }
      return parsed;
    } catch {
      // Corrupt or unavailable storage must never break navigation.
      try {
        storage.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
      return undefined;
    }
  };

  return {
    read<T>(key: string): T | undefined {
      const timestamp = now();
      const fromMemory = memory.get(key) as CacheEnvelope<T> | undefined;
      if (fromMemory) {
        if (timestamp - fromMemory.storedAt <= ttlMs) return fromMemory.value;
        memory.delete(key);
      }
      const persisted = readPersisted<T>(key);
      if (!persisted) return undefined;
      if (timestamp - persisted.storedAt > ttlMs) {
        storage?.removeItem(prefix + key);
        return undefined;
      }
      memory.set(key, persisted as CacheEnvelope<unknown>);
      return persisted.value;
    },

    write<T>(key: string, value: T): void {
      const envelope: CacheEnvelope<T> = { value, storedAt: now() };
      memory.set(key, envelope as CacheEnvelope<unknown>);
      if (!storage) return;
      try {
        storage.setItem(prefix + key, JSON.stringify(envelope));
      } catch {
        // Quota errors are non-fatal: the memory tier still serves the session.
      }
    },

    has(key: string): boolean {
      return this.read(key) !== undefined;
    },

    clear(): void {
      memory.clear();
      if (!storage) return;
      try {
        const keys: string[] = [];
        const total = storage.length ?? 0;
        for (let i = 0; i < total; i += 1) {
          const key = storage.key?.(i);
          if (key && key.startsWith(prefix)) keys.push(key);
        }
        keys.forEach((key) => storage.removeItem(key));
      } catch {
        /* ignore */
      }
    },

    size(): number {
      return memory.size;
    },
  };
}

/** Safe access to `window.localStorage` (absent in some SSR/test environments). */
export function getBrowserStorage(): CacheStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__pokedex_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
