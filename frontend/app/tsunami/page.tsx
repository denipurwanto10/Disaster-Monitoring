'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchTsunami, fetchTsunamiWarnings, type TsunamiEvent, type TsunamiMeta } from '@/lib/api';
import { useSocketConnected } from '@/lib/socket';
import { formatWaktu } from '@/lib/geo';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { EmptyState, ErrorState, SkeletonList } from '@/components/States';
import { TsunamiCard } from '@/components/TsunamiCard';

const HISTORY_LIMIT = 30;

export default function TsunamiPage() {
  const [warnings, setWarnings] = useState<TsunamiEvent[] | null>(null);
  const [history, setHistory] = useState<TsunamiEvent[] | null>(null);
  const [meta, setMeta] = useState<TsunamiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [w, h] = await Promise.all([
        fetchTsunamiWarnings().catch(() => null),
        fetchTsunami().catch(() => null),
      ]);
      setWarnings(w ? w.data : null);
      setHistory(h ? h.data.filter((e) => e.status !== 'warning') : null);
      setMeta(h?.meta ?? w?.meta ?? null);
      if (!w && !h) setError(true);
    } catch {
      // Gagal total — tampilkan error, jangan crash.
      setWarnings(null);
      setHistory(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const historyShown = (history ?? []).slice(0, HISTORY_LIMIT);

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Tsunami"
      subtitle="Sumber data: BMKG InaTEWS"
    >
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
        Buletin tsunami InaTEWS BMKG — gempa berpotensi tsunami + status peringatan.
        Satu gempa dapat menerbitkan beberapa buletin (PD-1 s/d PD-4) hingga
        dinyatakan berakhir — perhatikan waktu kejadian tiap buletin.
      </p>

      {meta?.observed_at && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500" role="status">
          <span>Observasi: {formatWaktu(meta.observed_at)} WIB</span>
          {meta.stale && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              Data cache — feed BMKG tidak terjangkau
            </span>
          )}
        </p>
      )}

      {loading && <SkeletonList rows={4} />}
      {error && !loading && (
        <ErrorState
          title="Data tsunami tidak tersedia"
          message="Buletin tsunami InaTEWS belum dapat dimuat. Coba lagi nanti."
          onRetry={load}
        />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Peringatan aktif */}
          <section aria-label="Peringatan tsunami aktif">
            <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-card">
              <div className="flex items-center gap-2 border-b border-red-100 px-4 py-2.5">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
                <h2 className="text-sm font-bold text-red-900">
                  Buletin peringatan ({warnings?.length ?? 0})
                </h2>
              </div>
              <div className="space-y-2.5 p-3">
                {warnings && warnings.length > 0 ? (
                  warnings.slice(0, 10).map((e) => <TsunamiCard key={e.event_id} event={e} />)
                ) : (
                  <EmptyState
                    title="Tidak ada peringatan aktif"
                    message="Saat ini tidak ada peringatan tsunami aktif dari InaTEWS BMKG."
                  />
                )}
                {warnings && warnings.length > 10 && (
                  <p className="px-1 text-xs text-slate-500">
                    + {warnings.length - 10} buletin lain — lihat riwayat di bawah.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Riwayat */}
          <section aria-label="Riwayat event tsunami">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <h2 className="text-sm font-bold text-slate-900">Riwayat</h2>
                <span className="text-[11px] text-slate-500">30 event terakhir</span>
              </div>
              <div className="space-y-2.5 p-3">
                {historyShown.length > 0 ? (
                  historyShown.map((e) => <TsunamiCard key={e.event_id} event={e} />)
                ) : (
                  <EmptyState
                    title="Belum ada riwayat"
                    message="Belum ada event tsunami tercatat dari InaTEWS BMKG."
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
