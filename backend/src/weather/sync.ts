import { fetchAlertsXml } from './client.js';
import type { WeatherAlert } from './types.js';

/** Loop sinkronisasi peringatan dini cuaca (nowcast BMKG), meniru pola volcano/sync.ts. */

export type WeatherSyncState = 'ok' | 'failed' | 'never';

export interface WeatherSyncStatus {
  state: WeatherSyncState;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  total: number;
  observedAt: string | null;
  lastError: string | null;
}

export interface WeatherSyncResult {
  ok: boolean;
  alerts: WeatherAlert[];
  count: number;
  newIds: string[];
  error?: string;
}

export interface WeatherAlertsPayload {
  alerts: WeatherAlert[];
  newIds: string[];
  observed_at: string;
}

const status: WeatherSyncStatus = {
  state: 'never',
  lastSyncAt: null,
  lastSuccessAt: null,
  total: 0,
  observedAt: null,
  lastError: null,
};

let timer: NodeJS.Timeout | null = null;
type Emitter = (event: string, payload: unknown) => void;
let emitter: Emitter | null = null;

let lastAlerts: WeatherAlert[] = [];
let lastPayload: WeatherAlertsPayload | null = null;
let knownIds = new Set<string>();

/** Pasang emitter socket (dipanggil dari wiring aplikasi). Opsional. */
export function setWeatherEmitter(emit: Emitter | null): void {
  emitter = emit;
}

export function getWeatherStatus(): WeatherSyncStatus {
  return { ...status };
}

/** Payload 'weather:alerts' terakhir yang di-emit (null bila belum pernah ada perubahan). */
export function getLastWeatherPayload(): WeatherAlertsPayload | null {
  return lastPayload ? { ...lastPayload, alerts: [...lastPayload.alerts], newIds: [...lastPayload.newIds] } : null;
}

/** Snapshot alert terakhir yang berhasil disinkronkan. */
export function getLastAlerts(): WeatherAlert[] {
  return [...lastAlerts];
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Satu putaran sinkronisasi peringatan dini. Tidak pernah melempar.
 * @param fetchFn fungsi fetch alert (untuk pengujian; default fetchAlertsXml).
 */
export async function syncAlertsOnce(
  fetchFn: () => Promise<WeatherAlert[]> = fetchAlertsXml,
): Promise<WeatherSyncResult> {
  status.lastSyncAt = nowIso();
  let alerts: WeatherAlert[];
  try {
    alerts = await fetchFn();
  } catch (err) {
    status.state = 'failed';
    status.lastError = (err as Error)?.message ?? 'Gagal mengambil peringatan dini BMKG.';
    return { ok: false, alerts: [...lastAlerts], count: lastAlerts.length, newIds: [], error: status.lastError };
  }

  const observedAt = nowIso();
  const ids = new Set(alerts.map((a) => a.id));
  const newIds = alerts.map((a) => a.id).filter((id) => !knownIds.has(id));
  const firstRun = knownIds.size === 0 && status.state === 'never';
  knownIds = ids;
  lastAlerts = [...alerts];

  status.state = 'ok';
  status.lastSuccessAt = observedAt;
  status.observedAt = observedAt;
  status.total = alerts.length;
  status.lastError = null;

  // Emit hanya saat ada alert baru — dan bukan pada prime pertama (hindari spam notifikasi).
  if (newIds.length > 0 && !firstRun) {
    const payload: WeatherAlertsPayload = { alerts: [...alerts], newIds, observed_at: observedAt };
    lastPayload = payload;
    try {
      emitter?.('weather:alerts', payload);
    } catch {
      /* emitter rusak tidak boleh menggagalkan sync */
    }
  }
  return { ok: true, alerts: [...alerts], count: alerts.length, newIds };
}

/** Sync awal: kegagalan tidak boleh menggagalkan boot. Tidak pernah melempar. */
export async function primeWeather(): Promise<void> {
  try {
    await syncAlertsOnce();
  } catch {
    /* BMKG down saat boot — tetap jalan */
  }
}

function defaultIntervalMs(): number {
  const v = Number(process.env.WEATHER_SYNC_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : 600000;
}

/** Jalankan loop sinkronisasi mandiri (default 10 menit). */
export function startWeatherLoop(ms?: number): void {
  if (timer) clearInterval(timer);
  const every = ms ?? defaultIntervalMs();
  timer = setInterval(() => {
    syncAlertsOnce().catch(() => undefined);
  }, every);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopWeatherLoop(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Reset status (untuk pengujian). */
export function resetWeatherStatus(): void {
  status.state = 'never';
  status.lastSyncAt = null;
  status.lastSuccessAt = null;
  status.total = 0;
  status.observedAt = null;
  status.lastError = null;
  lastAlerts = [];
  lastPayload = null;
  knownIds = new Set();
}
