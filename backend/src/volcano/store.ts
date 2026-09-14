import { slugify, type Volcano, type VolcanoLevel } from './types.js';
import type { ScrapedVolcano } from './scrape.js';
import { lookupCoords } from './coords.js';

export interface VolcanoCounts {
  awas: number;
  siaga: number;
  waspada: number;
  normal: number;
}

/**
 * Penyimpanan gunung api in-memory (fallback + cache baca), kunci = slug nama.
 * received_at pertama dipertahankan saat update; id numerik stabil per slug.
 */
export class VolcanoStore {
  private bySlug = new Map<string, Volcano>();
  private nextId = 1;

  /** Upsert hasil scrape; mengembalikan daftar baris hasil. Dedupe via slug. */
  upsert(list: ScrapedVolcano[], fetchedAt: string): Volcano[] {
    const out: Volcano[] = [];
    for (const s of list) {
      const external_id = slugify(s.name);
      const existing = this.bySlug.get(external_id);
      const coords = lookupCoords(s.name);
      if (existing) {
        const updated: Volcano = {
          ...existing,
          province: s.province,
          level: s.level,
          level_name: s.level_name,
          latitude: coords?.lat ?? null,
          longitude: coords?.lon ?? null,
          elevation_m: coords?.elev ?? null,
          report_url: s.report_url ?? existing.report_url,
          report_id: s.report_id ?? existing.report_id,
          observed_at: fetchedAt,
        };
        this.bySlug.set(external_id, updated);
        out.push(updated);
      } else {
        const row: Volcano = {
          id: this.nextId++,
          external_id,
          name: s.name,
          province: s.province,
          level: s.level,
          level_name: s.level_name,
          latitude: coords?.lat ?? null,
          longitude: coords?.lon ?? null,
          elevation_m: coords?.elev ?? null,
          report_url: s.report_url,
          report_id: s.report_id,
          source: 'MAGMA',
          observed_at: fetchedAt,
          received_at: fetchedAt,
        };
        this.bySlug.set(external_id, row);
        out.push(row);
      }
    }
    return out;
  }

  /** Semua gunung: level desc (Awas dulu), lalu nama asc. */
  allSorted(): Volcano[] {
    const arr = [...this.bySlug.values()];
    arr.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
    return arr;
  }

  getBySlug(slug: string): Volcano | null {
    return this.bySlug.get(slugify(slug)) ?? null;
  }

  size(): number {
    return this.bySlug.size;
  }

  levelCounts(): VolcanoCounts {
    const c: VolcanoCounts = { awas: 0, siaga: 0, waspada: 0, normal: 0 };
    for (const v of this.bySlug.values()) {
      if (v.level === 4) c.awas++;
      else if (v.level === 3) c.siaga++;
      else if (v.level === 2) c.waspada++;
      else if (v.level === 1) c.normal++;
    }
    return c;
  }

  byLevel(level: VolcanoLevel): Volcano[] {
    return this.allSorted().filter((v) => v.level === level);
  }

  clear(): void {
    this.bySlug.clear();
    this.nextId = 1;
  }
}

export const volcanoStore = new VolcanoStore();
