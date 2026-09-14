import axios from 'axios';
import { config } from '../config.js';
import { normalizeBmkgItem, normalizeBmkgList, type NormalizedQuake } from './normalize.js';

const TIMEOUT_MS = 15000;

export interface BmkgFetchResult {
  latest: NormalizedQuake | null; // dari autogempa (satu item)
  list: NormalizedQuake[]; // gabungan terkini + dirasakan + autogempa
  okCount: number; // jumlah sumber yang berhasil (0..3)
  totalSources: number;
}

async function getJson(url: string): Promise<unknown> {
  const res = await axios.get(url, { timeout: TIMEOUT_MS });
  return res.data;
}

/**
 * Ambil ketiga sumber BMKG secara paralel, toleran terhadap kegagalan per-sumber.
 * Tidak pernah melempar: kegagalan total menghasilkan { latest: null, list: [], okCount: 0 }.
 */
export async function fetchBmkg(
  urls: { autogempa?: string; terkini?: string; dirasakan?: string } = {},
): Promise<BmkgFetchResult> {
  const u = {
    autogempa: urls.autogempa ?? config.bmkg.autogempa,
    terkini: urls.terkini ?? config.bmkg.terkini,
    dirasakan: urls.dirasakan ?? config.bmkg.dirasakan,
  };
  const [auto, terkini, dirasakan] = await Promise.allSettled([
    getJson(u.autogempa),
    getJson(u.terkini),
    getJson(u.dirasakan),
  ]);

  let okCount = 0;
  let latest: NormalizedQuake | null = null;
  const list: NormalizedQuake[] = [];

  if (auto.status === 'fulfilled') {
    okCount++;
    try {
      const gempa = (auto.value as { Infogempa?: { gempa?: unknown } })?.Infogempa?.gempa;
      const n = gempa && typeof gempa === 'object' ? normalizeBmkgItem(gempa as never) : null;
      if (n) {
        latest = n;
        list.push(n);
      }
    } catch {
      /* abaikan item rusak */
    }
  }
  if (terkini.status === 'fulfilled') {
    okCount++;
    try {
      const arr = (terkini.value as { Infogempa?: { gempa?: unknown } })?.Infogempa?.gempa;
      list.push(...normalizeBmkgList(arr));
    } catch {
      /* abaikan */
    }
  }
  if (dirasakan.status === 'fulfilled') {
    okCount++;
    try {
      const arr = (dirasakan.value as { Infogempa?: { gempa?: unknown } })?.Infogempa?.gempa;
      list.push(...normalizeBmkgList(arr));
    } catch {
      /* abaikan */
    }
  }
  return { latest, list, okCount, totalSources: 3 };
}
