import { Router, type Request, type Response, type NextFunction } from 'express';
import { TtlCache } from '../weather/cache.js';
import { fetchTsunamiFeed } from './client.js';
import { tsunamiStore } from './store.js';
import { getTsunamiStatus } from './sync.js';

export const tsunamiRouter = Router();

export const TSUNAMI_TTL_MS = 10 * 60 * 1000;

/** Cache baca modul tsunami (TTL 10 menit, dedupe in-flight). */
export const tsunamiCache = new TtlCache();

export function clearTsunamiCache(): void {
  tsunamiCache.clear();
}

const INATEWS_URL = 'https://inatews.bmkg.go.id/';

/* ---------- daftar semua peristiwa tsunami ---------- */
tsunamiRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let observedAt = getTsunamiStatus().observedAt;
    let stale = false;
    try {
      const events = await tsunamiCache.getOrFetch('events', TSUNAMI_TTL_MS, fetchTsunamiFeed);
      tsunamiStore.upsert(events);
      observedAt = new Date().toISOString();
    } catch {
      // Upstream gagal: jangan 500 — kembalikan cache terakhir (tandai stale) atau kosong.
      stale = true;
    }
    const all = tsunamiStore.allSorted();
    const warnings = all.filter((e) => e.status === 'warning').length;
    res.json({
      data: all,
      meta: {
        total: all.length,
        warnings,
        observed_at: observedAt,
        stale,
        source: 'BMKG-InaTEWS',
        info_url: INATEWS_URL,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- hanya peringatan aktif ---------- */
tsunamiRouter.get('/warnings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let stale = false;
    try {
      const events = await tsunamiCache.getOrFetch('events', TSUNAMI_TTL_MS, fetchTsunamiFeed);
      tsunamiStore.upsert(events);
    } catch {
      stale = true;
    }
    const warnings = tsunamiStore.activeWarnings();
    res.json({
      data: warnings,
      meta: {
        count: warnings.length,
        observed_at: getTsunamiStatus().observedAt,
        stale,
        source: 'BMKG-InaTEWS',
        info_url: INATEWS_URL,
      },
    });
  } catch (err) {
    next(err);
  }
});
