import { Server } from 'socket.io';
import { fetchBmkg } from '../bmkg/client.js';
import type { NormalizedQuake } from '../bmkg/normalize.js';
import { getPool, isDbUnreachable } from '../db.js';
import { memoryStore, type QuakeRow } from '../store.js';
import { primeVolcanoes } from '../volcano/sync.js';

export type BmkgStatus = 'ok' | 'degraded' | 'unavailable';

export interface SyncStatus {
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  bmkgStatus: BmkgStatus;
  db: 'connected' | 'disconnected';
  totalKnown: number;
}

const status: SyncStatus = {
  lastSyncAt: null,
  lastSuccessAt: null,
  bmkgStatus: 'unavailable',
  db: 'disconnected',
  totalKnown: 0,
};

let latestAuto: NormalizedQuake | null = null;
let io: Server | null = null;
let timer: NodeJS.Timeout | null = null;
const seenExternal = new Set<string>();

export function attachSocket(server: Server): void {
  io = server;
}

export function getStatus(): SyncStatus {
  return { ...status };
}

export function getLatestAuto(): NormalizedQuake | null {
  return latestAuto;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function persistToDb(rows: NormalizedQuake[]): Promise<boolean> {
  if (process.env.DB_DISABLED === '1' || isDbUnreachable()) {
    status.db = 'disconnected';
    return false;
  }
  const pool = await getPool();
  if (!pool) {
    status.db = 'disconnected';
    return false;
  }
  try {
    const sql = `INSERT INTO earthquakes
      (external_id, magnitude, depth_km, latitude, longitude, location, event_time, tsunami_status, felt, shakemap, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BMKG')
      ON DUPLICATE KEY UPDATE
        magnitude = VALUES(magnitude), depth_km = VALUES(depth_km),
        latitude = VALUES(latitude), longitude = VALUES(longitude),
        location = VALUES(location), event_time = VALUES(event_time),
        tsunami_status = VALUES(tsunami_status), felt = VALUES(felt),
        shakemap = VALUES(shakemap)`;
    for (const q of rows) {
      await pool.execute(sql, [
        q.external_id,
        q.magnitude,
        q.depth_km,
        q.latitude,
        q.longitude,
        q.location,
        q.event_time,
        q.tsunami_status,
        q.felt,
        q.shakemap,
      ]);
    }
    status.db = 'connected';
    return true;
  } catch {
    status.db = 'disconnected';
    return false;
  }
}

async function loadFromDb(): Promise<QuakeRow[]> {
  const pool = await getPool().catch(() => null);
  if (!pool) return [];
  try {
    const [rows] = await pool.query(
      'SELECT * FROM earthquakes ORDER BY event_time DESC LIMIT 200',
    );
    const list = rows as Record<string, unknown>[];
    return list.map((r) => ({
      id: Number(r.id),
      external_id: String(r.external_id),
      magnitude: Number(r.magnitude),
      depth_km: Number(r.depth_km),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      location: String(r.location),
      event_time: toEventTimeStr(r.event_time),
      tsunami_status: (r.tsunami_status as string) ?? null,
      felt: (r.felt as string) ?? null,
      shakemap: (r.shakemap as string) ?? null,
      source: String(r.source ?? 'BMKG'),
      received_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? new Date().toISOString()),
      shakemap_url: r.shakemap ? 'https://data.bmkg.go.id/DataMKG/TEWS/' + String(r.shakemap) : null,
    }));
  } catch {
    return [];
  }
}

function toEventTimeStr(v: unknown): string {
  if (v instanceof Date) {
    // UTC agar konsisten dengan parseEventTime (dateStrings membuat cabang ini jarang terpakai).
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ` +
      `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`
    );
  }
  return String(v ?? '');
}

/** Satu putaran sinkronisasi. Tidak pernah melempar. */
export async function syncOnce(): Promise<SyncStatus> {
  status.lastSyncAt = nowIso();
  let result;
  try {
    result = await fetchBmkg();
  } catch {
    result = { latest: null, list: [], okCount: 0, totalSources: 3 };
  }

  if (result.okCount === 3) status.bmkgStatus = 'ok';
  else if (result.okCount >= 1) status.bmkgStatus = 'degraded';
  else status.bmkgStatus = 'unavailable';

  if (result.latest) latestAuto = result.latest;

  if (result.list.length > 0) {
    status.lastSuccessAt = nowIso();
    // Selalu upsert ke memory (fallback + cache baca).
    for (const q of result.list) {
      const { row, isNew } = memoryStore.upsert(q);
      if (isNew && seenExternal.has(q.external_id)) {
        // Sudah dikenal dari sesi/DB sebelumnya — jangan emit ulang.
      } else if (isNew) {
        seenExternal.add(q.external_id);
        io?.emit('earthquake:new', row);
      } else {
        seenExternal.add(q.external_id);
      }
    }
    // Upsert ke DB bila terjangkau (kegagalan DB tidak menggagalkan sync).
    persistToDb(result.list).catch(() => undefined);
    status.totalKnown = memoryStore.size();
  }

  io?.emit('status:update', { ...status });
  return { ...status };
}

/** Muat awal: coba isi memory dari DB, lalu sync pertama (tanpa menggagalkan boot). */
export async function primeStore(): Promise<void> {
  try {
    const rows = await loadFromDb();
    if (rows.length > 0) {
      status.db = 'connected';
      for (const r of rows) {
        memoryStore.upsert(r);
        seenExternal.add(r.external_id);
      }
      status.totalKnown = memoryStore.size();
    }
  } catch {
    /* DB down saat boot — tetap jalan dengan memory kosong */
  }
  try {
    await primeVolcanoes();
  } catch {
    /* MAGMA down saat boot — tetap jalan */
  }
  try {
    await syncOnce();
  } catch {
    /* BMKG down saat boot — tetap jalan */
  }
}

export function startSyncLoop(intervalMs: number): void {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    syncOnce().catch(() => undefined);
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopSyncLoop(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
