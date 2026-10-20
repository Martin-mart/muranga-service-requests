interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Tiny in-process TTL cache for reference data. Safe in a horizontally scaled
 * deployment because it only caches public, rarely-changing data: instances may
 * briefly disagree for at most `ttlMs`, which is acceptable for category lists.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns a cached value or loads it once, even under concurrent callers. */
  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > this.now()) {
      return entry.value;
    }

    const pending = this.inflight.get(key);
    if (pending) {
      return pending;
    }

    const load = loader()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, load);
    return load;
  }
}
