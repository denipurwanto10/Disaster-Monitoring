import { Router, type Request, type Response, type NextFunction } from 'express';
import { volcanoStore } from './store.js';
import { ValidationError } from '../utils/validate.js';
import { NAME_BY_LEVEL, type Volcano, type VolcanoLevel } from './types.js';

export const volcanoRouter = Router();

function volcanoToJson(v: Volcano): Record<string, unknown> {
  return {
    id: v.id,
    external_id: v.external_id,
    name: v.name,
    province: v.province,
    level: v.level,
    level_name: v.level_name,
    latitude: v.latitude,
    longitude: v.longitude,
    elevation_m: v.elevation_m,
    report_url: v.report_url,
    report_id: v.report_id,
    source: v.source,
    observed_at: v.observed_at,
    received_at: v.received_at,
  };
}

const LEVELS: VolcanoLevel[] = [4, 3, 2, 1];

/* ---------- daftar semua gunung (level desc, lalu nama) ---------- */
volcanoRouter.get('/', (_req: Request, res: Response) => {
  const all = volcanoStore.allSorted();
  res.json({
    data: all.map(volcanoToJson),
    meta: { total: all.length, counts: volcanoStore.levelCounts() },
  });
});

/* ---------- hitungan + pengelompokan per level ---------- */
volcanoRouter.get('/levels', (_req: Request, res: Response) => {
  res.json({
    data: LEVELS.map((level) => ({
      level,
      level_name: NAME_BY_LEVEL[level],
      count: volcanoStore.byLevel(level).length,
      volcanoes: volcanoStore
        .byLevel(level)
        .map((v) => ({ name: v.name, province: v.province, external_id: v.external_id })),
    })),
    meta: { total: volcanoStore.size(), counts: volcanoStore.levelCounts() },
  });
});

/* ---------- detail satu gunung ---------- */
volcanoRouter.get('/:slug', (req: Request, res: Response, next: NextFunction) => {
  try {
    const found = volcanoStore.getBySlug(req.params.slug);
    if (!found) {
      const err = new ValidationError('Data gunung api tidak ditemukan.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    res.json({ data: volcanoToJson(found) });
  } catch (err) {
    next(err);
  }
});
