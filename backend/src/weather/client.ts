import axios from 'axios';
import { UpstreamError, ValidationError } from '../utils/validate.js';
import type { Forecast, ForecastDay, ForecastSlot, WeatherAlert, WeatherLocation } from './types.js';

export const FORECAST_TIMEOUT_MS = 30000;
export const ALERTS_TIMEOUT_MS = 20000;

const ADM4_RE = /^\d{2}(\.\d{2}){2}\.\d{4}$/;

function weatherBaseUrl(): string {
  return process.env.BMKG_WEATHER_URL ?? 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
}

function nowcastUrl(): string {
  return process.env.BMKG_NOWCAST_URL ?? 'https://www.bmkg.go.id/alerts/nowcast/id';
}

export interface HttpLike {
  get(url: string, opts?: Record<string, unknown>): Promise<{ data: unknown }>;
}

function validateAdm4(adm4: string): void {
  if (!ADM4_RE.test(adm4)) throw new ValidationError('Kode wilayah tidak valid. Gunakan kode adm4, contoh: 31.71.03.1001.');
}

/* ---------- prakiraan cuaca ---------- */

/** Bentuk mentah satu slot prakiraan dari BMKG (field berlebih diabaikan). */
export interface RawSlot {
  datetime?: unknown;
  local_datetime?: unknown;
  t?: unknown;
  hu?: unknown;
  weather?: unknown;
  weather_desc?: unknown;
  weather_desc_en?: unknown;
  ws?: unknown;
  wd?: unknown;
  tcc?: unknown;
  tp?: unknown;
  vs_text?: unknown;
  image?: unknown;
  analysis_date?: unknown;
  [k: string]: unknown;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toSlot(raw: RawSlot): ForecastSlot {
  const datetime = str(raw.datetime);
  const local = str(raw.local_datetime) || datetime;
  return {
    datetime,
    local_datetime: local,
    t: num(raw.t),
    hu: num(raw.hu),
    weather: num(raw.weather),
    weather_desc: str(raw.weather_desc),
    weather_desc_en: str(raw.weather_desc_en),
    ws: num(raw.ws),
    wd: str(raw.wd),
    tcc: num(raw.tcc),
    tp: num(raw.tp),
    vs_text: str(raw.vs_text),
    image: str(raw.image),
  };
}

function toLocation(lok: Record<string, unknown>, adm4Fallback: string): WeatherLocation {
  const adm4 = typeof lok.adm4 === 'string' && lok.adm4 ? lok.adm4 : adm4Fallback;
  return {
    adm4,
    provinsi: str(lok.provinsi),
    kotkab: str(lok.kotkab),
    kecamatan: str(lok.kecamatan),
    desa: str(lok.desa),
    lon: lok.lon != null ? num(lok.lon) : undefined,
    lat: lok.lat != null ? num(lok.lat) : undefined,
  };
}

/**
 * Normalisasi respons prakiraan BMKG menjadi {@link Forecast}.
 * Menangani dua bentuk: {lokasi, data:[{lokasi, cuaca:[[...],[..]]}]}
 * dan {data:[{lokasi, cuaca:...}]} (tanpa lokasi tingkat atas, mis. Kota Sorong).
 */
export function normalizeForecast(json: unknown, adm4Fallback = ''): Forecast {
  const root = (json ?? {}) as Record<string, unknown>;
  const dataArr = Array.isArray(root.data) ? (root.data as Record<string, unknown>[]) : [];
  if (dataArr.length === 0) throw new UpstreamError('Data prakiraan BMKG tidak tersedia untuk wilayah ini.');
  const first = dataArr[0] ?? {};
  const lokRaw =
    (root.lokasi as Record<string, unknown> | undefined) ??
    (first.lokasi as Record<string, unknown> | undefined) ??
    {};
  const location = toLocation(lokRaw, adm4Fallback);

  // cuaca: array per-hari berisi array slot, atau (toleransi) array slot datar.
  const cuacaRaw = (first.cuaca ?? []) as unknown;
  const dayArrays: RawSlot[][] = Array.isArray(cuacaRaw)
    ? cuacaRaw.map((d) => (Array.isArray(d) ? (d as RawSlot[]) : [d as RawSlot]))
    : [];
  const flat: RawSlot[] = dayArrays.flat();
  if (flat.length === 0) throw new UpstreamError('Data prakiraan BMKG tidak tersedia untuk wilayah ini.');

  const days: ForecastDay[] = dayArrays.map((slots) => {
    const mapped = slots.map(toSlot);
    const date = (mapped[0]?.local_datetime ?? '').slice(0, 10);
    return { date, slots: mapped };
  });

  const analysisDate = str(flat[0]?.analysis_date);
  return { location, days, analysis_date: analysisDate };
}

/**
 * Ambil JSON prakiraan BMKG untuk satu kode adm4 lalu normalisasi.
 * @param adm4 kode wilayah "PP.KK.DD.NNNN". @param http klien HTTP (untuk pengujian).
 */
export async function fetchForecastJson(adm4: string, http: HttpLike = axios): Promise<Forecast> {
  validateAdm4(adm4);
  const res = await http.get(weatherBaseUrl(), {
    params: { adm4 },
    timeout: FORECAST_TIMEOUT_MS,
  });
  return normalizeForecast(res.data, adm4);
}

/* ---------- peringatan dini (nowcast RSS) ---------- */

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? decodeEntities(m[1].trim()) : '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Provinsi = teks setelah " di " terakhir pada judul; fallback "Indonesia". */
export function provinceFromTitle(title: string): string {
  const idx = title.toLowerCase().lastIndexOf(' di ');
  if (idx < 0) return 'Indonesia';
  const prov = title.slice(idx + 4).trim();
  return prov || 'Indonesia';
}

/** Heuristik tingkat keparahan dari judul + deskripsi. */
export function severityOf(title: string, description: string): WeatherAlert['severity'] {
  const text = `${title} ${description}`;
  if (/(lebat|ekstrem|badai|puting|kencang)/i.test(text)) return 'high';
  if (/(sedang)/i.test(text)) return 'medium';
  if (/(ringan|gerimis)/i.test(text)) return 'low';
  return 'medium';
}

/**
 * Parser RSS nowcast BMKG (murni, tanpa network): ekstrak tiap <item>.
 * Detail CAP XML tidak di-fetch — link hanya diteruskan.
 */
export function parseNowcastRss(xml: string): WeatherAlert[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const alerts: WeatherAlert[] = [];
  for (const item of items) {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    const guid = tag(item, 'guid');
    const description = stripTags(tag(item, 'description'));
    const pubDate = tag(item, 'pubDate');
    if (!title && !link) continue;
    alerts.push({
      id: guid || link,
      title,
      province: provinceFromTitle(title),
      link,
      description,
      pub_date: pubDate,
      severity: severityOf(title, description),
    });
  }
  return alerts;
}

/** Ambil XML RSS nowcast BMKG lalu parse. @param http klien HTTP (untuk pengujian). */
export async function fetchAlertsXml(http: HttpLike = axios): Promise<WeatherAlert[]> {
  const res = await http.get(nowcastUrl(), { timeout: ALERTS_TIMEOUT_MS, responseType: 'text' });
  const xml = typeof res.data === 'string' ? res.data : String(res.data ?? '');
  return parseNowcastRss(xml);
}
