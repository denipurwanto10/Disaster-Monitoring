import type { NormalizedQuake } from './bmkg/normalize.js';

/** Baris gempa lengkap (apa yang dikembalikan API). */
export interface QuakeRow extends NormalizedQuake {
  id: number;
  source: string;
  shakemap_url: string | null;
  /** ISO-8601 kapan aplikasi pertama kali menerima/menyimpan kejadian ini. */
  received_at: string;
}

const SHAKEMAP_BASE = 'https://data.bmkg.go.id/DataMKG/TEWS/';

export function withShakemapUrl(
  q: NormalizedQuake & { id: number; source?: string; received_at?: string },
): QuakeRow {
  const source = q.source ?? 'BMKG';
  return {
    ...q,
    source,
    received_at: q.received_at ?? new Date().toISOString(),
    shakemap_url: q.shakemap ? SHAKEMAP_BASE + q.shakemap : null,
  } as QuakeRow;
}

/**
 * Penyimpanan in-memory sebagai fallback saat MySQL tidak terjangkau,
 * sekaligus cache baca. Didahulukan (seed) dari fetch terakhir yang sukses.
 */
export class MemoryStore {
  private byExternal = new Map<string, QuakeRow>();
  private nextId = 1;

  /** Upsert; mengembalikan { row, isNew }. received_at pertama dipertahankan saat update. */
  upsert(q: NormalizedQuake): { row: QuakeRow; isNew: boolean } {
    const existing = this.byExternal.get(q.external_id);
    if (existing) {
      const prevReceived = (q as Partial<QuakeRow>).received_at ?? existing.received_at;
      // Gabungkan field opsional: sumber yang lebih kaya (autogempa: shakemap/felt)
      // tidak boleh dihapus oleh sumber yang lebih miskin (terkini tanpa field tsb).
      const merged: NormalizedQuake = {
        ...q,
        tsunami_status: q.tsunami_status ?? existing.tsunami_status,
        felt: q.felt ?? existing.felt,
        shakemap: q.shakemap ?? existing.shakemap,
      };
      const updated: QuakeRow = withShakemapUrl({
        ...merged,
        id: existing.id,
        source: existing.source,
        received_at: prevReceived,
      });
      this.byExternal.set(q.external_id, updated);
      return { row: updated, isNew: false };
    }
    const row = withShakemapUrl({ ...q, id: this.nextId++, source: 'BMKG' });
    this.byExternal.set(q.external_id, row);
    return { row, isNew: true };
  }

  getByExternal(id: string): QuakeRow | null {
    return this.byExternal.get(id) ?? null;
  }

  getById(id: number): QuakeRow | null {
    for (const r of this.byExternal.values()) if (r.id === id) return r;
    return null;
  }

  latest(): QuakeRow | null {
    let best: QuakeRow | null = null;
    for (const r of this.byExternal.values()) {
      if (!best || r.event_time > best.event_time) best = r;
    }
    return best;
  }

  size(): number {
    return this.byExternal.size;
  }

  allSorted(sort: 'asc' | 'desc' = 'desc'): QuakeRow[] {
    const arr = [...this.byExternal.values()];
    arr.sort((a, b) => (sort === 'asc' ? a.event_time.localeCompare(b.event_time) : b.event_time.localeCompare(a.event_time)));
    return arr;
  }

  clear(): void {
    this.byExternal.clear();
    this.nextId = 1;
  }
}

export const memoryStore = new MemoryStore();
