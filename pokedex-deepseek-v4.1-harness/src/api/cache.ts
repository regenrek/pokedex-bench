/**
 * Two-tier resource cache.
 *
 *  - Tier 1: an in-memory Map (instant, survives navigation, dies on reload).
 *  - Tier 2: `localStorage` (survives reloads, so a repeat visit makes zero
 *    network requests). Persisted entries are versioned and time-stamped; a
 *    stale or malformed envelope is silently discarded.
 *
 * The cache stores *normalised* view models (`PokemonDetail`, the index list)
 * rather than raw payloads: they are ~50x smaller, which keeps us far away
 * from the ~5MB localStorage budget even with all 151 entries stored.
 */

export const CACHE_VERSION = 3;
const STORAGE_PREFIX = `pokedex.v${CACHE_VERSION}.`;
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_PERSISTED_ENTRIES = 400;

interface Envelope<T> {
  savedAt: number;
  data: T;
}

export interface CacheStats {
  memoryHits: number;
  storageHits: number;
  misses: number;
  writes: number;
}

export interface ResourceCacheOptions {
  ttlMs?: number;
  storage?: Storage | null;
  now?: () => number;
}

function resolveStorage(explicit?: Storage | null): Storage | null {
  if (explicit !== undefined) return explicit;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    // Probe: Safari private mode throws on setItem.
    const probe = `${STORAGE_PREFIX}__probe__`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export class ResourceCache {
  private readonly memory = new Map<string, Envelope<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly ttlMs: number;
  private readonly storage: Storage | null;
  private readonly now: () => number;

  readonly stats: CacheStats = { memoryHits: 0, storageHits: 0, misses: 0, writes: 0 };

  constructor(options: ResourceCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.storage = resolveStorage(options.storage);
    this.now = options.now ?? (() => Date.now());
  }

  /** Reads a fresh entry, or `null` when missing/expired/unreadable. */
  get<T>(key: string): T | null {
    const memo = this.memory.get(key);
    if (memo && this.isFresh(memo)) {
      this.stats.memoryHits += 1;
      return memo.data as T;
    }

    const stored = this.readStorage<T>(key);
    if (stored) {
      this.stats.storageHits += 1;
      this.memory.set(key, stored);
      return stored.data;
    }

    this.stats.misses += 1;
    return null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  set<T>(key: string, data: T): void {
    const envelope: Envelope<T> = { savedAt: this.now(), data };
    this.memory.set(key, envelope as Envelope<unknown>);
    this.stats.writes += 1;
    this.writeStorage(key, envelope);
  }

  /**
   * De-duplicates concurrent requests for the same key: the first caller runs
   * `factory`, everyone else awaits the same promise. Rejections clear the
   * slot so a retry can happen.
   */
  async resolve<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const pending = this.inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = factory()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise as Promise<unknown>);
    return promise;
  }

  /** Test/debug helper — clears both tiers. */
  clear(): void {
    this.memory.clear();
    this.inflight.clear();
    this.stats.memoryHits = 0;
    this.stats.storageHits = 0;
    this.stats.misses = 0;
    this.stats.writes = 0;
    const storage = this.storage;
    if (!storage) return;
    try {
      const doomed: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) doomed.push(key);
      }
      doomed.forEach((key) => storage.removeItem(key));
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }

  private isFresh(envelope: Envelope<unknown>): boolean {
    return this.now() - envelope.savedAt < this.ttlMs;
  }

  private readStorage<T>(key: string): Envelope<T> | null {
    const storage = this.storage;
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Envelope<T>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.savedAt !== 'number' ||
        this.now() - parsed.savedAt >= this.ttlMs
      ) {
        storage.removeItem(STORAGE_PREFIX + key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private writeStorage<T>(key: string, envelope: Envelope<T>): void {
    const storage = this.storage;
    if (!storage) return;
    try {
      storage.setItem(STORAGE_PREFIX + key, JSON.stringify(envelope));
    } catch {
      // Quota exceeded (or storage disabled): drop the oldest half of our keys
      // and retry once. If that fails too, we simply stay memory-only.
      try {
        this.pruneStorage(Math.floor(MAX_PERSISTED_ENTRIES / 2));
        storage.setItem(STORAGE_PREFIX + key, JSON.stringify(envelope));
      } catch {
        /* memory-only from here on */
      }
    }
  }

  private pruneStorage(removeCount: number): void {
    const storage = this.storage;
    if (!storage || removeCount <= 0) return;
    const entries: { key: string; savedAt: number }[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      try {
        const parsed = JSON.parse(storage.getItem(key) ?? '') as Envelope<unknown>;
        entries.push({ key, savedAt: parsed.savedAt ?? 0 });
      } catch {
        entries.push({ key, savedAt: 0 });
      }
    }
    entries
      .sort((a, b) => a.savedAt - b.savedAt)
      .slice(0, removeCount)
      .forEach(({ key }) => storage.removeItem(key));
  }
}
