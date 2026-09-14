/** Cache TTL mungil dengan dedupe permintaan in-flight (agar hit berulang ke frontend tidak menghantam BMKG). */

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class TtlCache {
  private store = new Map<string, Entry>();
  private inflight = new Map<string, Promise<unknown>>();

  async getOrFetch<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > now) return hit.value as T;
    const running = this.inflight.get(key);
    if (running) return running as Promise<T>;
    const p = fn()
      .then((v) => {
        this.store.set(key, { value: v, expiresAt: Date.now() + ttlMs });
        return v;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, p);
    return p;
  }

  peek<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    return undefined;
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }
}

/** Singleton cache modul cuaca. */
export const weatherCache = new TtlCache();

export function clearWeatherCache(): void {
  weatherCache.clear();
}
