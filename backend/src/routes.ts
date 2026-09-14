import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPool } from './db.js';
import { getLatestAuto, getStatus } from './sync/service.js';
import { memoryStore, type QuakeRow } from './store.js';
import { validateListQuery, ValidationError } from './utils/validate.js';
import { searchRegions } from './regions.js';

export const router = Router();
const startTime = Date.now();

function rowToJson(r: QuakeRow): Record<string, unknown> {
  return {
    id: r.id,
    external_id: r.external_id,
    magnitude: r.magnitude,
    depth_km: r.depth_km,
    latitude: r.latitude,
    longitude: r.longitude,
    location: r.location,
    event_time: r.event_time,
    tsunami_status: r.tsunami_status,
    felt: r.felt,
    shakemap: r.shakemap,
    shakemap_url: r.shakemap_url,
    source: r.source,
    received_at: r.received_at,
  };
}

/* ---------- health ---------- */
router.get('/health', (_req: Request, res: Response) => {
  const s = getStatus();
  res.json({
    status: 'ok',
    db: s.db,
    bmkg: s.bmkgStatus,
    lastSyncAt: s.lastSyncAt,
    lastSuccessAt: s.lastSuccessAt,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

/* ---------- sumber data gabungan: DB bila bisa, memory bila tidak ---------- */
async function allRows(sort: 'asc' | 'desc'): Promise<QuakeRow[]> {
  if (process.env.DB_DISABLED === '1') return memoryStore.allSorted(sort);
  try {
    const pool = await getPool();
    if (!pool) return memoryStore.allSorted(sort);
    const order = sort === 'asc' ? 'ASC' : 'DESC';
    const [rows] = await pool.query(`SELECT * FROM earthquakes ORDER BY event_time ${order} LIMIT 500`);
    const list = rows as Record<string, unknown>[];
    if (list.length === 0) return memoryStore.allSorted(sort);
    return list.map((r) => ({
      id: Number(r.id),
      external_id: String(r.external_id),
      magnitude: Number(r.magnitude),
      depth_km: Number(r.depth_km),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      location: String(r.location),
      event_time: String(r.event_time),
      tsunami_status: (r.tsunami_status as string) ?? null,
      felt: (r.felt as string) ?? null,
      shakemap: (r.shakemap as string) ?? null,
      shakemap_url: r.shakemap ? 'https://data.bmkg.go.id/DataMKG/TEWS/' + String(r.shakemap) : null,
      source: String(r.source ?? 'BMKG'),
      // created_at = kapan baris pertama ditulis = kapan aplikasi menerima kejadian.
      received_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
    }));
  } catch {
    return memoryStore.allSorted(sort);
  }
}

function applyFilters(rows: QuakeRow[], q: ReturnType<typeof validateListQuery>): QuakeRow[] {
  return rows.filter((r) => {
    if (q.minMag !== null && r.magnitude < q.minMag) return false;
    if (q.maxMag !== null && r.magnitude > q.maxMag) return false;
    if (q.q && !r.location.toLowerCase().includes(q.q.toLowerCase())) return false;
    if (q.from && r.event_time < q.from) return false;
    if (q.to && r.event_time > q.to) return false;
    return true;
  });
}

function paginate(rows: QuakeRow[], limit: number, page: number, sort: 'asc' | 'desc') {
  const sorted = [...rows].sort((a, b) =>
    sort === 'asc' ? a.event_time.localeCompare(b.event_time) : b.event_time.localeCompare(a.event_time),
  );
  const total = sorted.length;
  const data = sorted.slice((page - 1) * limit, page * limit);
  return { data: data.map(rowToJson), meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

function handleList(defaultSort: 'asc' | 'desc') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = { ...req.query } as Record<string, unknown>;
      if (raw.sort === undefined) raw.sort = defaultSort;
      const q = validateListQuery(raw);
      const rows = await allRows(q.sort);
      res.json(paginate(applyFilters(rows, q), q.limit, q.page, q.sort));
    } catch (err) {
      next(err);
    }
  };
}

router.get('/earthquakes', handleList('desc'));
router.get('/earthquakes/history', handleList('desc'));

/* ---------- latest ---------- */
router.get('/earthquakes/latest', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const auto = getLatestAuto();
    if (auto) {
      const mem = memoryStore.getByExternal(auto.external_id);
      if (mem) return res.json({ data: rowToJson(mem) });
      return res.json({
        data: {
          ...auto,
          id: null,
          source: 'BMKG',
          received_at: new Date().toISOString(),
          shakemap_url: auto.shakemap ? 'https://data.bmkg.go.id/DataMKG/TEWS/' + auto.shakemap : null,
        },
      });
    }
    const latest = memoryStore.latest();
    if (!latest) {
      const err = new ValidationError('Belum ada data gempa. Sinkronisasi BMKG mungkin belum berhasil.');
      (err as ValidationError).status = 404;
      (err as ValidationError).code = 'NOT_FOUND';
      throw err;
    }
    res.json({ data: rowToJson(latest) });
  } catch (err) {
    next(err);
  }
});

/* ---------- by id ---------- */
router.get('/earthquakes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = req.params.id;
    let found: QuakeRow | null = null;
    if (/^\d+$/.test(idParam)) {
      found = memoryStore.getById(Number(idParam));
      if (!found && process.env.DB_DISABLED !== '1') {
        try {
          const pool = await getPool();
          if (pool) {
            const [rows] = await pool.query('SELECT * FROM earthquakes WHERE id = ? LIMIT 1', [Number(idParam)]);
            const list = rows as Record<string, unknown>[];
            if (list.length > 0) {
              const r = list[0];
              found = {
                id: Number(r.id),
                external_id: String(r.external_id),
                magnitude: Number(r.magnitude),
                depth_km: Number(r.depth_km),
                latitude: Number(r.latitude),
                longitude: Number(r.longitude),
                location: String(r.location),
                event_time: String(r.event_time),
                tsunami_status: (r.tsunami_status as string) ?? null,
                felt: (r.felt as string) ?? null,
                shakemap: (r.shakemap as string) ?? null,
                shakemap_url: r.shakemap ? 'https://data.bmkg.go.id/DataMKG/TEWS/' + String(r.shakemap) : null,
                source: String(r.source ?? 'BMKG'),
                received_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
              };
            }
          }
        } catch {
          /* fallback memory */
        }
      }
    } else {
      found = memoryStore.getByExternal(idParam);
    }
    if (!found) {
      const err = new ValidationError('Data gempa tidak ditemukan.');
      (err as ValidationError).status = 404;
      (err as ValidationError).code = 'NOT_FOUND';
      throw err;
    }
    res.json({ data: rowToJson(found) });
  } catch (err) {
    next(err);
  }
});

/* ---------- statistics ---------- */
router.get('/statistics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await allRows('desc');
    // event_time disimpan sebagai string UTC "YYYY-MM-DD HH:mm:ss" → bandingkan dalam UTC.
    const toMs = (s: string): number => new Date(s.replace(' ', 'T') + 'Z').getTime();
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayMs = 86400000;
    const now = Date.now();
    const inDays = (n: number) => rows.filter((r) => now - toMs(r.event_time) <= n * dayMs);

    const magDistribution = {
      '<5': rows.filter((r) => r.magnitude < 5).length,
      '5-5.9': rows.filter((r) => r.magnitude >= 5 && r.magnitude < 6).length,
      '6+': rows.filter((r) => r.magnitude >= 6).length,
    };
    const depthDistribution = {
      shallow: rows.filter((r) => r.depth_km < 70).length,
      intermediate: rows.filter((r) => r.depth_km >= 70 && r.depth_km <= 300).length,
      deep: rows.filter((r) => r.depth_km > 300).length,
    };

    const regionCount = new Map<string, number>();
    for (const r of rows) {
      const key = r.location.split(',')[0].trim().slice(0, 80) || 'Tidak diketahui';
      regionCount.set(key, (regionCount.get(key) ?? 0) + 1);
    }
    const topRegions = [...regionCount.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timeline: { date: string; count: number; maxMag: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      const dayRows = rows.filter((r) => r.event_time.slice(0, 10) === key);
      timeline.push({
        date: key,
        count: dayRows.length,
        maxMag: dayRows.length ? Math.max(...dayRows.map((r) => r.magnitude)) : null,
      });
    }

    res.json({
      today: rows.filter((r) => r.event_time.slice(0, 10) === todayStr).length,
      last7d: inDays(7).length,
      last30d: inDays(30).length,
      total: rows.length,
      magDistribution,
      depthDistribution,
      topRegions,
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- region search ---------- */
router.get('/regions/search', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json({ data: searchRegions(q) });
});
