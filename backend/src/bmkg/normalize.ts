import crypto from 'crypto';

/** Item mentah dari BMKG (semua field string, sebagian opsional). */
export interface BmkgRawItem {
  Tanggal?: string;
  Jam?: string;
  DateTime?: string;
  Coordinates?: string;
  Lintang?: string;
  Bujur?: string;
  Magnitude?: string | number;
  Kedalaman?: string | number;
  Wilayah?: string;
  Potensi?: string;
  Dirasakan?: string;
  Shakemap?: string;
  [key: string]: unknown;
}

/** Model internal ternormalisasi. */
export interface NormalizedQuake {
  external_id: string;
  magnitude: number;
  depth_km: number;
  latitude: number;
  longitude: number;
  location: string;
  event_time: string; // 'YYYY-MM-DD HH:mm:ss' (format DATETIME MySQL)
  tsunami_status: string | null;
  felt: string | null;
  shakemap: string | null;
}

export const SHAKEMAP_BASE = 'https://data.bmkg.go.id/DataMKG/TEWS/';

/** Parse "−9.52,112.85" / "-9.52, 112.85" menjadi [lat, lon]. */
export function parseCoordinates(input: unknown): [number, number] | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/[−–—]/g, '-');
  const parts = cleaned.split(',');
  if (parts.length !== 2) return null;
  const lat = Number(parts[0].trim());
  const lon = Number(parts[1].trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lat, lon];
}

/** Parse "10 km" / "10" menjadi angka km. */
export function parseDepth(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return Math.round(input);
  if (typeof input !== 'string') return null;
  const m = input.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? Math.round(v) : null;
}

/** Parse magnitudo menjadi angka 0..10. */
export function parseMagnitude(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input >= 0 && input <= 10 ? Math.round(input * 10) / 10 : null;
  }
  if (typeof input !== 'string') return null;
  const m = input.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  if (!Number.isFinite(v) || v < 0 || v > 10) return null;
  return Math.round(v * 10) / 10;
}

/** Parse DateTime BMKG (ISO) ke "YYYY-MM-DD HH:mm:ss" dalam UTC (deterministik, tak tergantung TZ server). */
export function parseEventTime(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const d = new Date(input.trim());
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/** ID unik deterministik: sha1(DateTime|Coordinates|Magnitude). */
export function toExternalId(dateTime: unknown, coordinates: unknown, magnitude: unknown): string {
  const raw = `${String(dateTime ?? '').trim()}|${String(coordinates ?? '').trim()}|${String(magnitude ?? '').trim()}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
}

/**
 * Normalisasi satu item BMKG ke model internal.
 * Toleran: `Potensi` boleh absen (khususnya gempadirasakan) → tsunami_status null.
 * `Dirasakan` (ada di autogempa & gempadirasakan) → felt.
 * Mengembalikan null bila field kunci (waktu/koordinat/magnitudo) tidak valid.
 */
export function normalizeBmkgItem(item: BmkgRawItem): NormalizedQuake | null {
  const coords = parseCoordinates(item.Coordinates);
  const mag = parseMagnitude(item.Magnitude);
  const eventTime = parseEventTime(item.DateTime);
  if (!coords || mag === null || eventTime === null) return null;
  const depth = parseDepth(item.Kedalaman) ?? 0;

  return {
    external_id: toExternalId(item.DateTime, item.Coordinates, item.Magnitude),
    magnitude: mag,
    depth_km: depth,
    latitude: coords[0],
    longitude: coords[1],
    location: str(item.Wilayah) ?? '-',
    event_time: eventTime,
    tsunami_status: str(item.Potensi),
    felt: str(item.Dirasakan),
    shakemap: str(item.Shakemap),
  };
}

/** Normalisasi daftar item, membuang yang tidak valid. */
export function normalizeBmkgList(items: unknown): NormalizedQuake[] {
  if (!Array.isArray(items)) return [];
  const out: NormalizedQuake[] = [];
  for (const it of items) {
    if (it && typeof it === 'object') {
      const n = normalizeBmkgItem(it as BmkgRawItem);
      if (n) out.push(n);
    }
  }
  return out;
}
