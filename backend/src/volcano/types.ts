/** Tipe data gunung api (sumber: MAGMA Indonesia / PVMBG Badan Geologi). */

export type VolcanoLevel = 1 | 2 | 3 | 4;

export type VolcanoLevelName = 'Normal' | 'Waspada' | 'Siaga' | 'Awas';

export interface Volcano {
  id: number;
  /** Slug stabil dari nama, dipakai sebagai kunci unik. */
  external_id: string;
  name: string;
  province: string;
  level: VolcanoLevel;
  level_name: VolcanoLevelName;
  latitude: number | null;
  longitude: number | null;
  elevation_m: number | null;
  report_url: string | null;
  /** ID numerik laporan MAGMA (diambil dari URL "Lihat laporan"). */
  report_id: string | null;
  source: 'MAGMA';
  /** ISO-8601 kapan halaman MAGMA terakhir diambil. */
  observed_at: string;
  /** ISO-8601 kapan aplikasi pertama kali menerima/menyimpan gunung ini. */
  received_at: string;
}

export const LEVEL_BY_NAME: Record<string, VolcanoLevel> = {
  awas: 4,
  siaga: 3,
  waspada: 2,
  normal: 1,
};

export const NAME_BY_LEVEL: Record<VolcanoLevel, VolcanoLevelName> = {
  4: 'Awas',
  3: 'Siaga',
  2: 'Waspada',
  1: 'Normal',
};

/** Slug URL: huruf kecil, non-alfanumerik menjadi "-". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
