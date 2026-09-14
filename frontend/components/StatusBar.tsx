'use client';

import { useEffect, useState } from 'react';
import { fetchHealth, type Health } from '@/lib/api';
import { relativeTime } from '@/lib/geo';

export type ConnState = 'realtime' | 'stale' | 'down';

export function useHealth(pollMs = 30000) {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const h = await fetchHealth();
        if (!alive) return;
        setHealth(h);
        setError(false);
      } catch {
        if (!alive) return;
        setError(true);
      }
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pollMs]);

  return { health, error };
}

export function connState(health: Health | null, fetchError: boolean, socketConnected: boolean): ConnState {
  // Backend mengirim bmkg: 'ok' | 'degraded' | 'unavailable'
  if (fetchError || (health && (health.bmkg === 'unavailable' || health.bmkg === 'down'))) return 'down';
  if (health && health.bmkg === 'degraded') return 'stale';
  if (socketConnected) return 'realtime';
  if (!health) return 'stale';
  const t = health.lastSuccessAt ? new Date(health.lastSuccessAt).getTime() : 0;
  if (t && Date.now() - t > 15 * 60000) return 'stale';
  return 'realtime';
}

const DOT: Record<ConnState, string> = {
  realtime: 'bg-emerald-500',
  stale: 'bg-amber-400',
  down: 'bg-red-500',
};

export default function StatusBar({
  health,
  fetchError,
  socketConnected,
  dark = false,
}: {
  health: Health | null;
  fetchError: boolean;
  socketConnected: boolean;
  dark?: boolean;
}) {
  const state = connState(health, fetchError, socketConnected);
  const text =
    state === 'realtime'
      ? 'Data realtime aktif'
      : state === 'stale'
        ? `Diperbarui ${relativeTime(health?.lastSuccessAt)}`
        : 'Sumber data tidak tersedia';
  const title = health?.lastSuccessAt
    ? `Sinkronisasi terakhir: ${new Date(health.lastSuccessAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
    : 'Belum ada data sinkronisasi';

  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-2.5 pr-3 text-xs font-medium ${
        dark ? 'bg-white/10 text-slate-100' : 'border border-slate-200 bg-slate-50 text-slate-700'
      }`}
      title={title}
      role="status"
      aria-label={`Status koneksi: ${text}`}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        {state === 'realtime' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOT[state]}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT[state]}`} />
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}
