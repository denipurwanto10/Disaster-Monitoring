import axios from 'axios';
import { UpstreamError } from '../utils/validate.js';
import { parseTsunamiFeed } from './parse.js';
import type { TsunamiEvent } from './types.js';

export const TSUNAMI_TIMEOUT_MS = 25000;

export function tsunamiFeedUrl(): string {
  return process.env.TSUNAMI_FEED_URL ?? 'https://cdn.bmkg.go.id/last30tsunamievent.xml';
}

export interface HttpLike {
  get(url: string, opts?: Record<string, unknown>): Promise<{ data: unknown }>;
}

/**
 * Ambil feed CAP InaTEWS lalu parse.
 * Hasil kosong (feed berubah/gagal parse) → UpstreamError agar rute
 * bisa jatuh kembali ke cache terakhir alih-alih 500.
 * @param http klien HTTP (untuk pengujian).
 */
export async function fetchTsunamiFeed(http: HttpLike = axios): Promise<TsunamiEvent[]> {
  let xml: string;
  try {
    const res = await http.get(tsunamiFeedUrl(), { timeout: TSUNAMI_TIMEOUT_MS, responseType: 'text' });
    xml = typeof res.data === 'string' ? res.data : String(res.data ?? '');
  } catch (err) {
    throw new UpstreamError('Data tsunami BMKG tidak tersedia saat ini. Silakan coba lagi nanti.');
  }
  const events = parseTsunamiFeed(xml);
  if (events.length === 0) {
    throw new UpstreamError('Data tsunami BMKG tidak tersedia saat ini.');
  }
  return events;
}
