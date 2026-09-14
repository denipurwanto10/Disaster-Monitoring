import { getPool, isDbUnreachable } from '../db.js';
import { fetchActivityPage, parseActivityHtml, type ScrapedVolcano } from './scrape.js';
import { volcanoStore } from './store.js';
import type { Volcano } from './types.js';

export type VolcanoSyncState = 'ok' | 'failed' | 'never';

export interface VolcanoSyncStatus {
  state: VolcanoSyncState;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  total: number;
  fetchedAt: string | null;
  /** Perubahan level pada sync terakhir: "Merapi: Waspada → Siaga". */
  changes: string[];
  lastError: string | null;
}

const status: VolcanoSyncStatus = {
  state: 'never',
  lastSyncAt: null,
  lastSuccessAt: null,
  total: 0,
  fetchedAt: null,
  changes: [],
  lastError: null,
};

let timer: NodeJS.Timeout | null = null;
type Emitter = (event: string, payload: unknown) => void;
let emitter: Emitter | null = null;

/** Pasang emitter socket (dipanggil dari wiring aplikasi). Opsional. */
export function setVolcanoEmitter(emit: Emitter | null): void {
  emitter = emit;
}

export function getVolcanoStatus(): VolcanoSyncStatus {
  return { ...status, changes: [...status.changes] };
}

function nowIso(): string {
  return new Date().toISOString();
}

function toObservedAt(fetchedAt: string): string {
  // MySQL DATETIME "YYYY-MM-DD HH:mm:ss" (UTC).
  return fetchedAt.slice(0, 19).replace('T', ' ');
}

async function persistToDb(rows: Volcano[], fetchedAt: string): Promise<void> {
  if (process.env.DB_DISABLED === '1' || isDbUnreachable()) return;
  const pool = await getPool().catch(() => null);
  if (!pool) return;
  try {
    const sql = `INSERT INTO volcanoes
      (external_id, name, province, level, level_name, latitude, longitude, elevation_m, report_url, report_id, source, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MAGMA', ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), province = VALUES(province),
        level = VALUES(level), level_name = VALUES(level_name),
        latitude = VALUES(latitude), longitude = VALUES(longitude),
        elevation_m = VALUES(elevation_m), report_url = VALUES(report_url),
        report_id = VALUES(report_id), observed_at = VALUES(observed_at)`;
    const observed = toObservedAt(fetchedAt);
    for (const v of rows) {
      await pool.execute(sql, [
        v.external_id,
        v.name,
        v.province,
        v.level,
        v.level_name,
        v.latitude,
        v.longitude,
        v.elevation_m,
        v.report_url,
        v.report_id,
        observed,
      ]);
    }
  } catch {
    /* kegagalan DB tidak menggagalkan sync */
  }
}

async function loadFromDb(): Promise<void> {
  if (process.env.DB_DISABLED === '1') return;
  const pool = await getPool().catch(() => null);
  if (!pool) return;
  try {
    const [rows] = await pool.query(
      'SELECT external_id, name, province, level, level_name, latitude, longitude, elevation_m, report_url, report_id, observed_at FROM volcanoes',
    );
    const list = rows as Record<string, unknown>[];
    if (list.length === 0) return;
    const fetchedAt = nowIso();
    const scraped: ScrapedVolcano[] = list.map((r) => ({
      level: Number(r.level) as ScrapedVolcano['level'],
      level_name: String(r.level_name) as ScrapedVolcano['level_name'],
      name: String(r.name),
      province: String(r.province),
      report_url: r.report_url != null ? String(r.report_url) : null,
      report_id: r.report_id != null ? String(r.report_id) : null,
    }));
    volcanoStore.upsert(scraped, fetchedAt);
    status.total = volcanoStore.size();
  } catch {
    /* abaikan — memory tetap dipakai */
  }
}

export interface VolcanoSyncResult {
  ok: boolean;
  total?: number;
  changes?: string[];
  error?: string;
}

/**
 * Satu putaran sinkronisasi gunung api. Tidak pernah melempar.
 * @param fetchFn fungsi fetch HTML (untuk pengujian; default fetchActivityPage).
 */
export async function syncVolcanoesOnce(
  fetchFn: () => Promise<string> = fetchActivityPage,
): Promise<VolcanoSyncResult> {
  status.lastSyncAt = nowIso();
  let html: string;
  try {
    html = await fetchFn();
  } catch (err) {
    status.state = 'failed';
    status.lastError = (err as Error)?.message ?? 'Gagal mengambil data MAGMA.';
    return { ok: false, error: status.lastError };
  }

  let scraped: ScrapedVolcano[];
  try {
    scraped = parseActivityHtml(html);
  } catch (err) {
    status.state = 'failed';
    status.lastError = (err as Error)?.message ?? 'Gagal memproses data MAGMA.';
    return { ok: false, error: status.lastError };
  }
  if (scraped.length === 0) {
    status.state = 'failed';
    status.lastError = 'Halaman MAGMA tidak memuat data gunung api.';
    return { ok: false, error: status.lastError };
  }

  const fetchedAt = nowIso();
  // Catat level lama untuk deteksi perubahan sebelum upsert.
  const prev = new Map(volcanoStore.allSorted().map((v) => [v.external_id, v.level_name] as const));
  const rows = volcanoStore.upsert(scraped, fetchedAt);
  const changes: string[] = [];
  for (const v of rows) {
    const old = prev.get(v.external_id);
    if (old && old !== v.level_name) changes.push(`${v.name}: ${old} → ${v.level_name}`);
  }

  status.state = 'ok';
  status.lastSuccessAt = fetchedAt;
  status.fetchedAt = fetchedAt;
  status.total = volcanoStore.size();
  status.changes = changes;
  status.lastError = null;

  persistToDb(rows, fetchedAt).catch(() => undefined);
  try {
    emitter?.('volcano:update', { total: status.total, changes, fetchedAt });
  } catch {
    /* emitter rusak tidak boleh menggagalkan sync */
  }
  return { ok: true, total: status.total, changes };
}

/** Muat awal: coba isi dari DB (bila ada), lalu sync pertama. Tidak pernah melempar. */
export async function primeVolcanoes(): Promise<void> {
  try {
    await loadFromDb();
  } catch {
    /* abaikan */
  }
  try {
    await syncVolcanoesOnce();
  } catch {
    /* MAGMA down saat boot — tetap jalan */
  }
}

function intervalMs(): number {
  const v = Number(process.env.VOLCANO_SYNC_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : 900000;
}

/** Jalankan loop sinkronisasi mandiri (default 15 menit). */
export function startVolcanoLoop(ms?: number): void {
  if (timer) clearInterval(timer);
  const every = ms ?? intervalMs();
  timer = setInterval(() => {
    syncVolcanoesOnce().catch(() => undefined);
  }, every);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopVolcanoLoop(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Reset status (untuk pengujian). */
export function resetVolcanoStatus(): void {
  status.state = 'never';
  status.lastSyncAt = null;
  status.lastSuccessAt = null;
  status.total = 0;
  status.fetchedAt = null;
  status.changes = [];
  status.lastError = null;
}
