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
  realtime: 'bg-[#3fb27f]',
  stale: 'bg-[#d9a23b]',
  down: 'bg-[#e05a47]',
};

export default function StatusBar({
  health,
  fetchError,
  socketConnected,
  dark = false,
  compact = false,
}: {
  health: Health | null;
  fetchError: boolean;
  socketConnected: boolean;
  dark?: boolean;
  /** hanya titik status (untuk sidebar yang diciutkan) */
  compact?: boolean;
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
      className={`inline-flex max-w-full items-center rounded-full text-xs font-medium transition-colors duration-500 ${
        compact ? 'h-9 w-9 justify-center' : 'gap-2.5 py-1.5 pl-3 pr-3.5'
      } ${
        dark
          ? 'bg-white/[0.06] text-[color:var(--basalt-ink)] ring-1 ring-inset ring-white/10'
          : 'border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink-2)]'
      }`}
      title={title}
      role="status"
      aria-label={`Status koneksi: ${text}`}
    >
      <span
        className={`relative h-2 w-2 shrink-0 rounded-full transition-colors duration-500 ${DOT[state]} ${
          state === 'realtime' ? 'dm-live-dot' : ''
        }`}
        aria-hidden="true"
      />
      {!compact && <span className="truncate">{text}</span>}
    </span>
  );
}
