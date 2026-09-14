import axios from 'axios';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

export interface Quake {
  id: number | string;
  external_id?: string;
  magnitude: number;
  depth_km: number;
  latitude: number;
  longitude: number;
  location: string;
  event_time: string;
  tsunami_status?: string | null;
  felt?: string | null;
  shakemap?: string | null;
  shakemap_url?: string | null;
  source?: string;
  received_at?: string;
}

export interface QuakeListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Health {
  status: string;
  db: string;
  bmkg: string;
  lastSyncAt?: string | null;
  lastSuccessAt?: string | null;
  uptime?: number;
}

export interface Statistics {
  today: number;
  last7d: number;
  last30d: number;
  total: number;
  strongest30d?: { magnitude: number; location?: string; event_time?: string } | null;
  magDistribution: { minor_lt5: number; moderate_5_59: number; strong_gte6: number };
  depthDistribution: { shallow_lt70: number; intermediate_70_300: number; deep_gt300: number };
  topRegions: { region: string; count: number }[];
  timeline: { date: string; count: number; maxMag: number }[];
}

export interface RegionResult {
  name: string;
  province?: string;
  latitude: number;
  longitude: number;
}

/** Ambil payload dari respons yang mungkin dibungkus { data } atau mentah. */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    const d = (payload as Record<string, unknown>).data;
    // Bedakan { data: [...] } milik axios vs { data: [quake] } milik API:
    // keduanya sama — langsung kembalikan isi data.
    return d as T;
  }
  return payload as T;
}

/** Normalisasi angka yang bisa datang sebagai string. */
function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeQuake(raw: Record<string, unknown>): Quake {
  return {
    id: (raw.id ?? raw.external_id ?? '') as number | string,
    external_id: raw.external_id as string | undefined,
    magnitude: num(raw.magnitude ?? raw.mag ?? raw.Magnitude),
    depth_km: num(raw.depth_km ?? raw.depth ?? raw.Kedalaman),
    latitude: num(raw.latitude ?? raw.lat ?? raw.Lintang ?? raw.point_lat),
    longitude: num(raw.longitude ?? raw.lon ?? raw.Bujur ?? raw.point_lon ?? raw.lng),
    location: String(raw.location ?? raw.wilayah ?? raw.Wilayah ?? '-'),
    event_time: String(raw.event_time ?? raw.DateTime ?? raw.datetime ?? ''),
    tsunami_status: (raw.tsunami_status ?? raw.Tsunami ?? null) as string | null,
    felt: (raw.felt ?? raw.Dirasakan ?? null) as string | null,
    shakemap: (raw.shakemap ?? raw.Shakemap ?? null) as string | null,
    shakemap_url: (raw.shakemap_url as string | null | undefined) ?? null,
    source: (raw.source as string | undefined) ?? 'BMKG',
    received_at: raw.received_at as string | undefined,
  };
}

export async function fetchHealth(): Promise<Health> {
  const res = await api.get('/health');
  return unwrap<Health>(res.data);
}

export async function fetchLatest(): Promise<Quake | null> {
  const res = await api.get('/earthquakes/latest');
  const raw = unwrap<Record<string, unknown> | null>(res.data);
  if (!raw) return null;
  return normalizeQuake(raw);
}

export async function fetchQuakes(params?: {
  limit?: number;
  page?: number;
  minMag?: number | string;
  maxMag?: number | string;
  q?: string;
  from?: string;
  to?: string;
  sort?: string;
}): Promise<{ data: Quake[]; meta: QuakeListMeta }> {
  const res = await api.get('/earthquakes', { params });
  const body = res.data;
  if (Array.isArray(body)) {
    const data = body.map((r) => normalizeQuake(r as Record<string, unknown>));
    return { data, meta: { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    const raw = (body as { data: Record<string, unknown>[]; meta?: QuakeListMeta }).data;
    const meta = (body as { meta?: QuakeListMeta }).meta ?? {
      page: 1,
      limit: raw.length,
      total: raw.length,
      totalPages: 1,
    };
    return { data: raw.map(normalizeQuake), meta };
  }
  return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
}

export async function fetchHistory(params?: {
  limit?: number;
  page?: number;
  minMag?: number | string;
  maxMag?: number | string;
  q?: string;
  from?: string;
  to?: string;
  sort?: string;
}): Promise<{ data: Quake[]; meta: QuakeListMeta }> {
  try {
    const res = await api.get('/earthquakes/history', { params });
    const body = res.data;
    if (Array.isArray(body)) {
      const data = body.map((r) => normalizeQuake(r as Record<string, unknown>));
      return { data, meta: { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
    }
    if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
      const raw = (body as { data: Record<string, unknown>[]; meta?: QuakeListMeta }).data;
      const meta = (body as { meta?: QuakeListMeta }).meta ?? {
        page: 1,
        limit: raw.length,
        total: raw.length,
        totalPages: 1,
      };
      return { data: raw.map(normalizeQuake), meta };
    }
  } catch {
    // fallback ke /earthquakes bila endpoint history belum ada
  }
  return fetchQuakes(params);
}

export async function fetchQuakeById(id: string | number): Promise<Quake> {
  const res = await api.get(`/earthquakes/${id}`);
  const raw = unwrap<Record<string, unknown>>(res.data);
  return normalizeQuake(raw);
}

export async function fetchStatistics(): Promise<Statistics> {
  const res = await api.get('/statistics');
  const s = unwrap<Record<string, unknown>>(res.data);
  const mag = (s.magDistribution ?? s.mag_distribution ?? {}) as Record<string, unknown>;
  const dep = (s.depthDistribution ?? s.depth_distribution ?? {}) as Record<string, unknown>;
  const mnum = (v: unknown) => num(v, 0);
  return {
    today: mnum(s.today),
    last7d: mnum(s.last7d ?? s.week ?? s.last7days),
    last30d: mnum(s.last30d ?? s.month ?? s.last30days),
    total: mnum(s.total),
    strongest30d: (s.strongest30d ?? s.strongest ?? null) as Statistics['strongest30d'],
    magDistribution: {
      minor_lt5: mnum(mag.minor_lt5 ?? mag['<5'] ?? mag.minor),
      moderate_5_59: mnum(mag.moderate_5_59 ?? mag['5-5.9'] ?? mag.moderate),
      strong_gte6: mnum(mag.strong_gte6 ?? mag['6+'] ?? mag.strong),
    },
    depthDistribution: {
      shallow_lt70: mnum(dep.shallow_lt70 ?? dep.shallow ?? dep['<70']),
      intermediate_70_300: mnum(dep.intermediate_70_300 ?? dep.intermediate ?? dep['70-300']),
      deep_gt300: mnum(dep.deep_gt300 ?? dep.deep ?? dep['>300']),
    },
    topRegions: ((s.topRegions ?? s.top_regions ?? []) as { region?: string; name?: string; count: number }[]).map(
      (r) => ({ region: String(r.region ?? r.name ?? ''), count: mnum(r.count) }),
    ),
    timeline: ((s.timeline ?? []) as { date: string; count: number; maxMag?: number; maxmag?: number }[]).map((t) => ({
      date: String(t.date),
      count: mnum(t.count),
      maxMag: mnum(t.maxMag ?? t.maxmag),
    })),
  };
}

export async function searchRegions(q: string): Promise<RegionResult[]> {
  if (!q.trim()) return [];
  const res = await api.get('/regions/search', { params: { q } });
  const body = res.data;
  const arr = Array.isArray(body) ? body : (body.data ?? []);
  return (arr as Record<string, unknown>[]).map((r) => ({
    name: String(r.name ?? r.region ?? ''),
    province: r.province ? String(r.province) : undefined,
    latitude: num(r.latitude ?? r.lat),
    longitude: num(r.longitude ?? r.lon ?? r.lng),
  }));
}

/* ---------------- Gunung Api (MAGMA) ---------------- */

export type VolcanoLevelName = 'Normal' | 'Waspada' | 'Siaga' | 'Awas';

export interface Volcano {
  id: number | string;
  slug: string;
  name: string;
  province: string;
  level: 1 | 2 | 3 | 4;
  level_name: VolcanoLevelName;
  latitude: number | null;
  longitude: number | null;
  elevation_m: number | null;
  report_url: string | null;
  source: string;
  observed_at?: string | null;
  received_at?: string | null;
}

export interface VolcanoCounts {
  awas: number;
  siaga: number;
  waspada: number;
  normal: number;
}

export interface VolcanoLevelGroup {
  level: 1 | 2 | 3 | 4;
  level_name: string;
  count: number;
  volcanoes: { name: string; province: string }[];
}

export interface VolcanoLevels {
  counts: VolcanoCounts;
  levels: VolcanoLevelGroup[];
}

export interface VolcanoListMeta {
  total: number;
  counts: VolcanoCounts;
}

export const VOLCANO_LEVEL_COLORS: Record<number, string> = {
  4: '#7f1d1d', // Awas — dark red
  3: '#b91c1c', // Siaga — red-700
  2: '#d97706', // Waspada — amber-600
  1: '#15803d', // Normal — green-700
};

export function volcanoLevelColor(level: number): string {
  return VOLCANO_LEVEL_COLORS[level] ?? '#475569';
}

export function volcanoLevelName(level: number): VolcanoLevelName {
  if (level >= 4) return 'Awas';
  if (level === 3) return 'Siaga';
  if (level === 2) return 'Waspada';
  return 'Normal';
}

function volcanoLevelFromName(name: unknown): 1 | 2 | 3 | 4 | null {
  const s = String(name ?? '').trim().toLowerCase();
  if (s === 'awas' || s === '4' || s === 'iv') return 4;
  if (s === 'siaga' || s === '3' || s === 'iii') return 3;
  if (s === 'waspada' || s === '2' || s === 'ii') return 2;
  if (s === 'normal' || s === '1' || s === 'i') return 1;
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nullableNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/** Normalisasi satu gunung — toleran terhadap variasi nama field backend. */
export function normalizeVolcano(raw: Record<string, unknown>): Volcano {
  const name = String(raw.name ?? raw.nama ?? '-');
  const fromName = volcanoLevelFromName(raw.level_name ?? raw.status ?? raw.activity_level);
  const rawLevel = nullableNum(raw.level ?? raw.status_code);
  const level: 1 | 2 | 3 | 4 =
    rawLevel != null && rawLevel >= 1 && rawLevel <= 4
      ? (Math.round(rawLevel) as 1 | 2 | 3 | 4)
      : (fromName ?? 1);
  const level_name = (fromName ? volcanoLevelName(fromName) : undefined) ??
    (typeof raw.level_name === 'string' && raw.level_name
      ? (raw.level_name as VolcanoLevelName)
      : volcanoLevelName(level));
  const slug =
    (raw.slug as string | undefined) ??
    (raw.external_id as string | undefined) ??
    (typeof raw.id === 'string' && Number.isNaN(Number(raw.id)) ? (raw.id as string) : slugify(name));
  const reportUrl = raw.report_url ?? raw.laporan_url ?? raw.url ?? null;
  return {
    id: (raw.id ?? raw.external_id ?? slug) as number | string,
    slug: String(slug),
    name,
    province: String(raw.province ?? raw.provinsi ?? '-'),
    level,
    level_name,
    latitude: nullableNum(raw.latitude ?? raw.lat ?? raw.Lintang),
    longitude: nullableNum(raw.longitude ?? raw.lon ?? raw.lng ?? raw.Bujur),
    elevation_m: nullableNum(raw.elevation_m ?? raw.elevasi ?? raw.elevation ?? raw.tinggi),
    report_url: typeof reportUrl === 'string' && reportUrl ? reportUrl : null,
    source: (raw.source as string | undefined) ?? 'MAGMA',
    observed_at: (raw.observed_at ?? raw.observedAt ?? null) as string | null,
    received_at: raw.received_at as string | undefined,
  };
}

function countsFromVolcanoes(list: Volcano[]): VolcanoCounts {
  const c: VolcanoCounts = { awas: 0, siaga: 0, waspada: 0, normal: 0 };
  for (const v of list) {
    if (v.level === 4) c.awas += 1;
    else if (v.level === 3) c.siaga += 1;
    else if (v.level === 2) c.waspada += 1;
    else c.normal += 1;
  }
  return c;
}

function normalizeCounts(raw: unknown, fallback: VolcanoCounts): VolcanoCounts {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  return {
    awas: num(r.awas, fallback.awas),
    siaga: num(r.siaga, fallback.siaga),
    waspada: num(r.waspada, fallback.waspada),
    normal: num(r.normal, fallback.normal),
  };
}

export async function fetchVolcanoes(): Promise<{ data: Volcano[]; meta: VolcanoListMeta }> {
  const res = await api.get('/volcanoes');
  const body = res.data;
  const wrap = (list: Volcano[], counts?: VolcanoCounts) => {
    const c = counts ?? countsFromVolcanoes(list);
    return { data: list, meta: { total: list.length, counts: c } };
  };
  if (Array.isArray(body)) return wrap(body.map((r) => normalizeVolcano(r as Record<string, unknown>)));
  if (body && typeof body === 'object') {
    const b = body as { data?: unknown; meta?: { total?: number; counts?: unknown } };
    if (Array.isArray(b.data)) {
      const list = (b.data as Record<string, unknown>[]).map(normalizeVolcano);
      const metaCounts =
        b.meta?.counts != null
          ? normalizeCounts(b.meta.counts, countsFromVolcanoes(list))
          : countsFromVolcanoes(list);
      return { data: list, meta: { total: num(b.meta?.total, list.length), counts: metaCounts } };
    }
  }
  return { data: [], meta: { total: 0, counts: { awas: 0, siaga: 0, waspada: 0, normal: 0 } } };
}

export async function fetchVolcanoLevels(): Promise<VolcanoLevels> {
  const res = await api.get('/volcanoes/levels');
  const body = res.data;
  // Backend bisa membungkus dalam { data: {...} } — uraikan dulu.
  const inner =
    body && typeof body === 'object' && !Array.isArray(body) && 'data' in (body as Record<string, unknown>) &&
    (body as { data: unknown }).data &&
    typeof (body as { data: unknown }).data === 'object'
      ? ((body as { data: unknown }).data as Record<string, unknown>)
      : (body as Record<string, unknown>);
  // Toleran: bila endpoint levels (mis. saat di-intercept) mengembalikan
  // deretan gunung, hitung ringkasannya dari sana (pakai meta.counts bila ada).
  if (Array.isArray(inner)) {
    const list = (inner as Record<string, unknown>[]).map(normalizeVolcano);
    const metaCounts =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { meta?: { counts?: unknown } }).meta?.counts
        : undefined;
    return { counts: normalizeCounts(metaCounts, countsFromVolcanoes(list)), levels: [] };
  }
  const levelsRaw = (inner.levels ?? inner.data ?? []) as unknown[];
  const levels: VolcanoLevelGroup[] = Array.isArray(levelsRaw)
    ? (levelsRaw as Record<string, unknown>[]).map((l) => {
        const fromName = volcanoLevelFromName(l.level_name ?? l.name);
        const lv = nullableNum(l.level);
        const level: 1 | 2 | 3 | 4 =
          lv != null && lv >= 1 && lv <= 4 ? (Math.round(lv) as 1 | 2 | 3 | 4) : (fromName ?? 1);
        const vols = Array.isArray(l.volcanoes) ? (l.volcanoes as Record<string, unknown>[]) : [];
        return {
          level,
          level_name: String(l.level_name ?? l.name ?? volcanoLevelName(level)),
          count: num(l.count ?? vols.length, vols.length),
          volcanoes: vols.map((v) => ({
            name: String(v.name ?? ''),
            province: String(v.province ?? ''),
          })),
        };
      })
    : [];
  const counts = normalizeCounts(
    inner.counts,
    levels.length > 0
      ? countsFromVolcanoes(
          levels.flatMap((l) =>
            l.volcanoes.map((v) => ({ level: l.level }) as Volcano),
          ),
        )
      : { awas: 0, siaga: 0, waspada: 0, normal: 0 },
  );
  return { counts, levels };
}

export async function fetchVolcanoBySlug(slug: string | number): Promise<Volcano> {
  const res = await api.get(`/volcanoes/${slug}`);
  const raw = unwrap<Record<string, unknown>>(res.data);
  return normalizeVolcano(raw);
}

/* ---------------- Cuaca BMKG (prakiraan + peringatan dini) ---------------- */

export interface WeatherLocation {
  adm4: string;
  provinsi: string;
  kotkab: string;
  kecamatan: string;
  desa: string;
  lon?: number | null;
  lat?: number | null;
}

export interface ForecastSlot {
  datetime?: string;
  local_datetime?: string;
  t?: number | null;
  hu?: number | null;
  weather?: number | string | null;
  weather_desc?: string;
  weather_desc_en?: string;
  ws?: number | null;
  wd?: string | null;
  tcc?: number | null;
  tp?: number | null;
  vs_text?: string | null;
  image?: string | null;
}

export interface ForecastDay {
  date: string;
  slots: ForecastSlot[];
}

export interface Forecast {
  location: WeatherLocation;
  days: ForecastDay[];
  analysis_date?: string | null;
}

export interface WeatherAlert {
  id: string;
  title: string;
  province: string;
  link?: string | null;
  description?: string | null;
  pub_date?: string | null;
  severity: 'high' | 'medium' | 'low';
}

export function weatherSeverityColor(severity: unknown): string {
  const s = String(severity ?? '').trim().toLowerCase();
  if (
    s === 'high' || s === 'tinggi' || s === 'berat' || s === 'bahaya' ||
    s === 'awas' || s.includes('high') || s.includes('berat')
  ) return '#b91c1c';
  if (
    s === 'medium' || s === 'sedang' || s === 'menengah' ||
    s === 'waspada' || s === 'siaga' || s.includes('med') || s.includes('sedang')
  ) return '#d97706';
  if (s === 'low' || s === 'rendah' || s.includes('low') || s.includes('rendah') || s === '') return '#15803d';
  return '#15803d';
}

function weatherSeverityFrom(raw: unknown): 'high' | 'medium' | 'low' {
  const s = String(raw ?? '').trim().toLowerCase();
  if (
    s.includes('high') || s.includes('tinggi') || s.includes('berat') ||
    s.includes('bahaya') || s === 'awas' || s === '3' || s === 'iii'
  ) return 'high';
  if (
    s.includes('med') || s.includes('sedang') || s.includes('menengah') ||
    s.includes('waspada') || s.includes('siaga') || s === '2' || s === 'ii'
  ) return 'medium';
  return 'low';
}

export function normalizeWeatherLocation(raw: Record<string, unknown>): WeatherLocation {
  return {
    adm4: String(raw.adm4 ?? raw.kode ?? raw.id ?? ''),
    provinsi: String(raw.provinsi ?? raw.province ?? raw.propinsi ?? '-'),
    kotkab: String(raw.kotkab ?? raw.kota ?? raw.kabupaten ?? raw['kota/kab'] ?? '-'),
    kecamatan: String(raw.kecamatan ?? raw.district ?? '-'),
    desa: String(raw.desa ?? raw.kelurahan ?? raw.village ?? raw.name ?? '-'),
    lon: nullableNum(raw.lon ?? raw.lng ?? raw.longitude ?? raw.lon_x ?? null),
    lat: nullableNum(raw.lat ?? raw.latitude ?? raw.lat_y ?? null),
  };
}

export function normalizeForecastSlot(raw: Record<string, unknown>): ForecastSlot {
  const numOrNull = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : null;
  };
  return {
    datetime: raw.datetime != null ? String(raw.datetime) : raw.local_datetime != null ? String(raw.local_datetime) : undefined,
    local_datetime: raw.local_datetime != null ? String(raw.local_datetime) : raw.datetime != null ? String(raw.datetime) : undefined,
    t: numOrNull(raw.t ?? raw.temp ?? raw.suhu),
    hu: numOrNull(raw.hu ?? raw.humidity ?? raw.kelembapan),
    weather: (raw.weather ?? raw.cuaca ?? null) as number | string | null,
    weather_desc: raw.weather_desc != null ? String(raw.weather_desc) : raw.cuaca_desc != null ? String(raw.cuaca_desc) : raw.description != null ? String(raw.description) : undefined,
    weather_desc_en: raw.weather_desc_en != null ? String(raw.weather_desc_en) : undefined,
    ws: numOrNull(raw.ws ?? raw.wind_speed ?? raw.angin),
    wd: raw.wd != null ? String(raw.wd) : raw.wind_dir != null ? String(raw.wind_dir) : undefined,
    tcc: numOrNull(raw.tcc ?? raw.cloud ?? null),
    tp: numOrNull(raw.tp ?? raw.rain ?? raw.hujan ?? null),
    vs_text: raw.vs_text != null ? String(raw.vs_text) : raw.visibility != null ? String(raw.visibility) : null,
    image: raw.image != null ? String(raw.image) : undefined,
  };
}

/** Normalisasi prakiraan — toleran terhadap {data:{location,days}} maupun BMKG mentah {lokasi,data:[{lokasi,cuaca:[[..],[..],[..]]}]}. */
export function normalizeForecast(payload: unknown): Forecast {
  const body = unwrap<Record<string, unknown>>(payload);
  const b = (body ?? {}) as Record<string, unknown>;
  // Bentuk kanonis: { location, days } (juga terima lokasi/location, data/days).
  const locRaw = (b.location ?? b.lokasi ?? b.place ?? {}) as Record<string, unknown>;
  const daysRaw = (b.days ?? b.data ?? b.forecast ?? b.prakiraan) as unknown;
  if (Array.isArray(daysRaw) && (locRaw.adm4 || b.adm4)) {
    const loc = (locRaw.adm4 ? locRaw : b) as Record<string, unknown>;
    const days: ForecastDay[] = (daysRaw as unknown[]).map((d) => {
      if (Array.isArray(d)) {
        const slots = (d as unknown[]).map((s) => normalizeForecastSlot((s ?? {}) as Record<string, unknown>));
        return { date: String(slots[0]?.local_datetime ?? slots[0]?.datetime ?? '').slice(0, 10), slots };
      }
      const o = (d ?? {}) as Record<string, unknown>;
      const slotsRaw = (o.slots ?? o.cuaca ?? o.hours ?? []) as unknown[];
      const slots = Array.isArray(slotsRaw)
        ? slotsRaw.map((s) => normalizeForecastSlot((s ?? {}) as Record<string, unknown>))
        : [];
      return { date: String(o.date ?? o.tanggal ?? slots[0]?.local_datetime ?? '').slice(0, 10), slots };
    });
    return {
      location: normalizeWeatherLocation(loc),
      days,
      analysis_date: (b.analysis_date ?? b.analisis_date ?? null) as string | null,
    };
  }
  // Bentuk mentah BMKG: { lokasi, data: [{ lokasi, cuaca: [[..],[..],[..]] }] }
  const lokasiRaw = (b.lokasi ?? b.location ?? {}) as Record<string, unknown>;
  const dataArr = (b.data ?? []) as unknown[];
  if (Array.isArray(dataArr) && dataArr.length > 0 && (dataArr[0] as Record<string, unknown>)?.cuaca) {
    const first = (dataArr[0] ?? {}) as Record<string, unknown>;
    const cuaca = (first.cuaca ?? []) as unknown[];
    const innerLoc = ((first.lokasi ?? lokasiRaw) ?? {}) as Record<string, unknown>;
    const days: ForecastDay[] = (cuaca as unknown[]).map((daySlots, i) => {
      const arr = (Array.isArray(daySlots) ? daySlots : []) as Record<string, unknown>[];
      const slots = arr.map((s) => normalizeForecastSlot((s ?? {}) as Record<string, unknown>));
      const date = String(slots[0]?.local_datetime ?? slots[0]?.datetime ?? '').slice(0, 10) ||
        String((innerLoc.tanggal ?? '') as string) || `hari-${i + 1}`;
      return { date, slots };
    });
    return {
      location: normalizeWeatherLocation({ ...lokasiRaw, ...innerLoc }),
      days,
      analysis_date: (b.analysis_date ?? null) as string | null,
    };
  }
  // Fallback: lokasi saja tanpa hari.
  return {
    location: normalizeWeatherLocation({ ...lokasiRaw, ...(b as Record<string, unknown>) }),
    days: [],
    analysis_date: (b.analysis_date ?? null) as string | null,
  };
}

export function normalizeWeatherAlert(raw: Record<string, unknown>, index = 0): WeatherAlert {
  const id = String(raw.id ?? raw.alert_id ?? raw.kode ?? `alert-${index}`);
  return {
    id,
    title: String(raw.title ?? raw.judul ?? raw.nama ?? 'Peringatan dini cuaca'),
    province: String(raw.province ?? raw.provinsi ?? raw.wilayah ?? '-'),
    link: (raw.link ?? raw.url ?? raw.report_url ?? null) as string | null,
    description: raw.description != null ? String(raw.description) : raw.deskripsi != null ? String(raw.deskripsi) : null,
    pub_date: raw.pub_date != null ? String(raw.pub_date) : raw.published_at != null ? String(raw.published_at) : raw.tanggal != null ? String(raw.tanggal) : null,
    severity: weatherSeverityFrom(raw.severity ?? raw.level ?? raw.tingkat),
  };
}

export async function fetchWeatherLocations(q = '', limit = 12): Promise<WeatherLocation[]> {
  const res = await api.get('/weather/locations', { params: { q, limit } });
  const body = res.data;
  const arr = Array.isArray(body) ? body : unwrap<unknown>(body);
  const list = (Array.isArray(arr) ? arr : []) as Record<string, unknown>[];
  return list.map(normalizeWeatherLocation).filter((l) => l.adm4);
}

export async function fetchForecast(adm4: string): Promise<Forecast> {
  const res = await api.get('/weather/forecast', { params: { adm4 } });
  return normalizeForecast(res.data);
}

/** Mengembalikan deretan peringatan aktif — toleran {data:[..]} maupun array mentah. */
export async function fetchAlerts(): Promise<WeatherAlert[]> {
  const res = await api.get('/weather/alerts');
  const body = res.data;
  if (Array.isArray(body)) {
    return (body as Record<string, unknown>[]).map((r, i) => normalizeWeatherAlert(r, i));
  }
  if (body && typeof body === 'object') {
    const b = body as { data?: unknown };
    if (Array.isArray(b.data)) {
      return (b.data as Record<string, unknown>[]).map((r, i) => normalizeWeatherAlert(r, i));
    }
  }
  return [];
}

/* ---------------- Tsunami InaTEWS (BMKG) ---------------- */

export type TsunamiStatus = 'warning' | 'ended';

export interface TsunamiEvent {
  event_id: string;
  magnitude: number | null;
  depth_km: number | null;
  area: string;
  latitude: number | null;
  longitude: number | null;
  event_time: string;
  status: TsunamiStatus;
  warning_level: string | null;
  potential: string | null;
  headline: string | null;
  description: string | null;
  source: string;
}

export interface TsunamiMeta {
  total: number;
  warnings: number;
  observed_at?: string | null;
  stale?: boolean;
}

function nullableNumTsunami(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

/** Normalisasi satu event tsunami — toleran terhadap variasi nama field backend. */
export function normalizeTsunamiEvent(raw: Record<string, unknown>, index = 0): TsunamiEvent {
  const statusRaw = String(raw.status ?? raw.state ?? 'ended').trim().toLowerCase();
  const status: TsunamiStatus =
    statusRaw === 'warning' || statusRaw === 'aktif' || statusRaw === 'active' || statusRaw === 'peringatan'
      ? 'warning'
      : 'ended';
  return {
    event_id: String(raw.event_id ?? raw.id ?? raw.external_id ?? `tsunami-${index}`),
    magnitude: nullableNumTsunami(raw.magnitude ?? raw.mag),
    depth_km: nullableNumTsunami(raw.depth_km ?? raw.depth ?? raw.kedalaman),
    area: String(raw.area ?? raw.wilayah ?? raw.location ?? '-'),
    latitude: nullableNumTsunami(raw.latitude ?? raw.lat ?? raw.Lintang),
    longitude: nullableNumTsunami(raw.longitude ?? raw.lon ?? raw.lng ?? raw.Bujur),
    event_time: String(raw.event_time ?? raw.datetime ?? raw.DateTime ?? raw.waktu ?? ''),
    status,
    warning_level: nullableStr(raw.warning_level ?? raw.level ?? raw.peringatan_level),
    potential: nullableStr(raw.potential ?? raw.potensi),
    headline: nullableStr(raw.headline ?? raw.judul),
    description: nullableStr(raw.description ?? raw.deskripsi ?? raw.narasi),
    source: String(raw.source ?? 'BMKG InaTEWS'),
  };
}

/** Uraikan respons tsunami yang bisa berbentuk {data,meta}, array mentah, atau objek tunggal. */
function unpackTsunami(body: unknown): { data: TsunamiEvent[]; meta: TsunamiMeta; observedAt?: string | null; stale?: boolean } {
  const toList = (arr: unknown[]): TsunamiEvent[] =>
    (arr as Record<string, unknown>[]).map((r, i) => normalizeTsunamiEvent((r ?? {}) as Record<string, unknown>, i));
  const metaOf = (list: TsunamiEvent[], metaRaw?: Record<string, unknown> | null, observedFallback?: string | null, staleFallback?: boolean): TsunamiMeta => {
    const m = metaRaw ?? {};
    const warnings = list.filter((e) => e.status === 'warning').length;
    return {
      total: num(m.total ?? list.length, list.length),
      warnings: num(m.warnings ?? m.warning_count ?? warnings, warnings),
      observed_at: (m.observed_at ?? m.observedAt ?? observedFallback ?? null) as string | null,
      stale: Boolean(m.stale ?? staleFallback ?? false),
    };
  };
  if (Array.isArray(body)) return { data: toList(body), meta: metaOf(toList(body)) };
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.data)) {
      const list = toList(b.data as unknown[]);
      const metaRaw = (b.meta ?? {}) as Record<string, unknown>;
      return {
        data: list,
        meta: metaOf(list, metaRaw, (b.observed_at ?? null) as string | null, b.stale as boolean | undefined),
      };
    }
    // Objek tunggal mentah → anggap satu event.
    if (b.event_id != null || b.event_time != null || b.area != null || b.magnitude != null) {
      const list = [normalizeTsunamiEvent(b, 0)];
      return { data: list, meta: metaOf(list) };
    }
  }
  return { data: [], meta: { total: 0, warnings: 0, observed_at: null, stale: false } };
}

export async function fetchTsunami(): Promise<{ data: TsunamiEvent[]; meta: TsunamiMeta }> {
  const res = await api.get('/tsunami');
  const { data, meta } = unpackTsunami(res.data);
  return { data, meta };
}

export async function fetchTsunamiWarnings(): Promise<{ data: TsunamiEvent[]; meta: TsunamiMeta }> {
  const res = await api.get('/tsunami/warnings');
  const { data, meta } = unpackTsunami(res.data);
  // Toleran: bila backend belum memfilter, saring sisi klien ke status warning.
  const filtered = data.filter((e) => e.status === 'warning');
  return { data: filtered, meta: { ...meta, warnings: filtered.length } };
}
