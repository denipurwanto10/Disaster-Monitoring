import { fetchTsunamiFeed } from './client.js';
import { tsunamiStore, type TsunamiRow } from './store.js';
import type { TsunamiEvent } from './types.js';

/** Loop sinkronisasi feed tsunami InaTEWS, meniru pola weather/sync.ts. */

export type TsunamiSyncState = 'ok' | 'failed' | 'never';

export interface TsunamiSyncStatus {
  state: TsunamiSyncState;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  total: number;
  warnings: number;
  observedAt: string | null;
  lastError: string | null;
}

export interface TsunamiSyncResult {
  ok: boolean;
  events: TsunamiRow[];
  count: number;
  newIds: string[];
  error?: string;
}

export interface TsunamiUpdatePayload {
  events: TsunamiRow[];
  newIds: string[];
  count: number;
  observed_at: string;
}

const status: TsunamiSyncStatus = {
  state: 'never',
  lastSyncAt: null,
  lastSuccessAt: null,
  total: 0,
  warnings: 0,
  observedAt: null,
  lastError: null,
};

let timer: NodeJS.Timeout | null = null;
type Emitter = (event: string, payload: unknown) => void;
let emitter: Emitter | null = null;

let knownIds = new Set<string>();

/** Pasang emitter socket (dipanggil dari wiring aplikasi). Opsional. */
export function setTsunamiEmitter(emit: Emitter | null): void {
  emitter = emit;
}

export function getTsunamiStatus(): TsunamiSyncStatus {
  return { ...status };
}

/** Snapshot peristiwa terakhir yang berhasil disinkronkan. */
export function getLastTsunami(): TsunamiRow[] {
  return tsunamiStore.allSorted();
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Satu putaran sinkronisasi tsunami. Tidak pernah melempar.
 * @param fetchFn fungsi fetch feed (untuk pengujian; default fetchTsunamiFeed).
 */
export async function syncTsunamiOnce(
  fetchFn: () => Promise<TsunamiEvent[]> = fetchTsunamiFeed,
): Promise<TsunamiSyncResult> {
  status.lastSyncAt = nowIso();
  let events: TsunamiEvent[];
  try {
    events = await fetchFn();
  } catch (err) {
    status.state = 'failed';
    status.lastError = (err as Error)?.message ?? 'Gagal mengambil data tsunami BMKG.';
    const cached = tsunamiStore.allSorted();
    return { ok: false, events: cached, count: cached.length, newIds: [], error: status.lastError };
  }

  const observedAt = nowIso();
  const freshIds = events.map((e) => e.event_id);
  const newIds = freshIds.filter((id) => !knownIds.has(id));
  const firstRun = knownIds.size === 0 && status.state === 'never';
  knownIds = new Set(freshIds);

  const rows = tsunamiStore.upsert(events, observedAt);

  status.state = 'ok';
  status.lastSuccessAt = observedAt;
  status.observedAt = observedAt;
  status.total = tsunamiStore.size();
  status.warnings = tsunamiStore.activeWarnings().length;
  status.lastError = null;

  // Emit hanya saat ada event_id baru — dan bukan pada prime pertama.
  if (newIds.length > 0 && !firstRun) {
    const newEvents = rows.filter((r) => newIds.includes(r.event_id));
    const payload: TsunamiUpdatePayload = {
      events: newEvents,
      newIds,
      count: status.total,
      observed_at: observedAt,
    };
    try {
      emitter?.('tsunami:update', payload);
    } catch {
      /* emitter rusak tidak boleh menggagalkan sync */
    }
  }
  return { ok: true, events: tsunamiStore.allSorted(), count: status.total, newIds };
}

/** Sync awal: kegagalan tidak boleh menggagalkan boot. Tidak pernah melempar. */
export async function primeTsunami(): Promise<void> {
  try {
    await syncTsunamiOnce();
  } catch {
    /* InaTEWS down saat boot — tetap jalan */
  }
}

function defaultIntervalMs(): number {
  const v = Number(process.env.TSUNAMI_SYNC_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : 600000;
}

/** Jalankan loop sinkronisasi mandiri (default 10 menit). */
export function startTsunamiLoop(ms?: number): void {
  if (timer) clearInterval(timer);
  const every = ms ?? defaultIntervalMs();
  timer = setInterval(() => {
    syncTsunamiOnce().catch(() => undefined);
  }, every);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopTsunamiLoop(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Reset status + store (untuk pengujian). */
export function resetTsunamiStatus(): void {
  status.state = 'never';
  status.lastSyncAt = null;
  status.lastSuccessAt = null;
  status.total = 0;
  status.warnings = 0;
  status.observedAt = null;
  status.lastError = null;
  knownIds = new Set();
  tsunamiStore.clear();
}
