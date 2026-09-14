/**
 * Tabel koordinat bawaan gunung api Indonesia (lat/lon desimal + elevasi meter).
 * Kunci: nama gunung huruf kecil. Koordinat memakai nilai yang dikenal luas
 * (PVMBG/MAGMA, GVP). Gunung tanpa entri di sini disimpan dengan lat/lon null
 * (tidak tampil di peta) — tidak menggagalkan sinkronisasi.
 */

export interface VolcanoCoords {
  lat: number;
  lon: number;
  elev?: number;
}

export const VOLCANO_COORDS: Record<string, VolcanoCoords> = {
  // ---- Level III (Siaga) — Sep 2026 ----
  'anak krakatau': { lat: -6.102, lon: 105.423, elev: 157 },
  krakatau: { lat: -6.102, lon: 105.423, elev: 157 },
  'lewotobi laki-laki': { lat: -8.542, lon: 122.775, elev: 1584 },
  merapi: { lat: -7.542, lon: 110.442, elev: 2910 },
  semeru: { lat: -8.108, lon: 112.92, elev: 3676 },
  sinabung: { lat: 3.17, lon: 98.392, elev: 2460 },

  // ---- Level II (Waspada) — Sep 2026 ----
  awu: { lat: 3.67, lon: 125.5, elev: 1320 },
  bromo: { lat: -7.942, lon: 112.95, elev: 2329 },
  kerinci: { lat: -1.697, lon: 101.264, elev: 3805 },
  marapi: { lat: -0.381, lon: 100.474, elev: 2891 },
  raung: { lat: -8.119, lon: 114.056, elev: 3332 },
  slamet: { lat: -7.242, lon: 109.208, elev: 3428 },
  dukono: { lat: 1.68, lon: 127.88, elev: 1335 },
  ibu: { lat: 1.488, lon: 127.63, elev: 1325 },
  karangetang: { lat: 2.78, lon: 125.4, elev: 1784 },
  lokon: { lat: 1.358, lon: 124.792, elev: 1580 },
  soputan: { lat: 1.112, lon: 124.737, elev: 1785 },
  gamalama: { lat: 0.8, lon: 127.33, elev: 1715 },
  'ili lewotolok': { lat: -8.272, lon: 123.505, elev: 1547 },
  lewotolok: { lat: -8.272, lon: 123.505, elev: 1547 },
  rinjani: { lat: -8.42, lon: 116.47, elev: 3726 },
  barujari: { lat: -8.42, lon: 116.47, elev: 3726 },
  sangeangapi: { lat: -8.2, lon: 119.07, elev: 1949 },
  dempo: { lat: -4.03, lon: 103.13, elev: 3173 },
  'banda api': { lat: -4.523, lon: 129.877, elev: 641 },
  'bur ni telong': { lat: 4.766, lon: 96.83, elev: 2617 },
  sorikmarapi: { lat: 0.686, lon: 99.539, elev: 2145 },
  tambora: { lat: -8.25, lon: 118.0, elev: 2850 },
  'anak ranakah': { lat: -8.62, lon: 120.52, elev: 2350 },
  ranakah: { lat: -8.62, lon: 120.52, elev: 2350 },
  iya: { lat: -8.897, lon: 121.645, elev: 637 },

  // ---- Level I (Normal) — gunung utama ----
  agung: { lat: -8.342, lon: 115.508, elev: 3031 },
  batur: { lat: -8.242, lon: 115.375, elev: 1717 },
  ciremai: { lat: -6.892, lon: 108.404, elev: 3078 },
  cereme: { lat: -6.892, lon: 108.404, elev: 3078 },
  dieng: { lat: -7.2, lon: 109.92 },
  kelud: { lat: -7.935, lon: 112.315, elev: 1731 },
  kelut: { lat: -7.935, lon: 112.315, elev: 1731 },
  merbabu: { lat: -7.455, lon: 110.43, elev: 3145 },
  papandayan: { lat: -7.32, lon: 107.73, elev: 2665 },
  'tangkuban parahu': { lat: -6.77, lon: 107.6, elev: 2084 },
  galunggung: { lat: -7.25, lon: 108.058, elev: 2168 },
  guntur: { lat: -7.143, lon: 107.833, elev: 2249 },
  gede: { lat: -6.788, lon: 106.98, elev: 2958 },
  pangrango: { lat: -6.788, lon: 106.98, elev: 2958 },
  salak: { lat: -6.72, lon: 106.73, elev: 2211 },
  ebulobo: { lat: -8.82, lon: 121.19, elev: 2127 },
  egon: { lat: -8.67, lon: 122.45, elev: 1703 },

  // ---- Cadangan (pernah aktif / dipantau) ----
  ambang: { lat: -0.758, lon: 124.42, elev: 1795 },
  colo: { lat: -0.17, lon: 121.608, elev: 507 },
  gamkonora: { lat: 1.38, lon: 127.52, elev: 1635 },
  talang: { lat: -0.978, lon: 100.679, elev: 2597 },
  kaba: { lat: -3.52, lon: 102.62, elev: 1952 },
};

/** Cari koordinat berdasarkan nama gunung (case-insensitive). Null bila tidak dikenal. */
export function lookupCoords(name: string): VolcanoCoords | null {
  const key = name.toLowerCase().trim();
  return VOLCANO_COORDS[key] ?? null;
}
