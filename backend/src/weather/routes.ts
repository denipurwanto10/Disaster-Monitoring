import { Router, type Request, type Response, type NextFunction } from 'express';
import { weatherCache } from './cache.js';
import { fetchAlertsXml, fetchForecastJson } from './client.js';
import { searchLocations } from './locations.js';
import { getLastAlerts, getWeatherStatus } from './sync.js';
import type { WeatherAlert } from './types.js';
import { ValidationError, UpstreamError } from '../utils/validate.js';

export const weatherRouter = Router();

export const FORECAST_TTL_MS = 30 * 60 * 1000;
export const ALERTS_TTL_MS = 10 * 60 * 1000;

const UPSTREAM_MSG = 'Data cuaca BMKG tidak tersedia saat ini. Silakan coba lagi nanti.';

/* ---------- lokasi kurasi ---------- */
weatherRouter.get('/locations', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const rawLimit = Number(req.query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 20) : 20;
  res.json({ data: searchLocations(q, limit) });
});

/* ---------- prakiraan cuaca ---------- */
weatherRouter.get('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adm4 = typeof req.query.adm4 === 'string' ? req.query.adm4.trim() : '';
    if (!adm4) throw new ValidationError('Parameter adm4 wajib diisi, contoh: 31.71.03.1001.');
    let forecast;
    try {
      forecast = await weatherCache.getOrFetch(`forecast:${adm4}`, FORECAST_TTL_MS, () =>
        fetchForecastJson(adm4),
      );
    } catch (err) {
      if (err instanceof ValidationError || err instanceof UpstreamError) throw err;
      throw new UpstreamError(UPSTREAM_MSG);
    }
    res.json({ data: forecast, meta: { source: 'BMKG', credit: 'Data: BMKG (api.bmkg.go.id)' } });
  } catch (err) {
    next(err);
  }
});

/* ---------- peringatan dini ---------- */
weatherRouter.get('/alerts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let alerts: WeatherAlert[];
    let observedAt = getWeatherStatus().observedAt;
    let stale = false;
    try {
      alerts = await weatherCache.getOrFetch<WeatherAlert[]>('alerts', ALERTS_TTL_MS, fetchAlertsXml);
      observedAt = new Date().toISOString();
    } catch {
      // Upstream gagal: jangan 500 — kembalikan cache terakhir (tandai stale) atau kosong.
      alerts = getLastAlerts();
      stale = true;
    }
    res.json({ data: alerts, meta: { total: alerts.length, observed_at: observedAt, stale } });
  } catch (err) {
    next(err);
  }
});
