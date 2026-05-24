type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }
}
