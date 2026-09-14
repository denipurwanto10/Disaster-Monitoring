import type { TsunamiEvent } from './types.js';

export interface TsunamiRow extends TsunamiEvent {
  /** Waktu pertama kali terlihat server (ISO); stabil antar sync. */
  received_at: string;
}

/**
 * Penyimpanan tsunami in-memory, kunci = event_id.
 * received_at pertama dipertahankan saat update; upsert idempoten.
 */
export class TsunamiStore {
  private byId = new Map<string, TsunamiRow>();

  /** Upsert peristiwa; mengembalikan baris hasil. */
  upsert(events: TsunamiEvent[], observedAt?: string): TsunamiRow[] {
    const at = observedAt ?? new Date().toISOString();
    const out: TsunamiRow[] = [];
    for (const e of events) {
      const existing = this.byId.get(e.event_id);
      if (existing) {
        const updated: TsunamiRow = { ...existing, ...e, received_at: existing.received_at };
        this.byId.set(e.event_id, updated);
        out.push(updated);
      } else {
        const row: TsunamiRow = { ...e, received_at: at };
        this.byId.set(e.event_id, row);
        out.push(row);
      }
    }
    return out;
  }

  /** Semua peristiwa: event_time desc (terbaru dulu). */
  allSorted(): TsunamiRow[] {
    const arr = [...this.byId.values()];
    arr.sort((a, b) => (a.event_time < b.event_time ? 1 : a.event_time > b.event_time ? -1 : 0));
    return arr;
  }

  /** Hanya peringatan aktif (status 'warning'). */
  activeWarnings(): TsunamiRow[] {
    return this.allSorted().filter((e) => e.status === 'warning');
  }

  get(eventId: string): TsunamiRow | null {
    return this.byId.get(eventId) ?? null;
  }

  size(): number {
    return this.byId.size;
  }

  clear(): void {
    this.byId.clear();
  }
}

export const tsunamiStore = new TsunamiStore();
