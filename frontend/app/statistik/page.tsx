'use client';

import { useEffect, useState } from 'react';
import { fetchStatistics, type Statistics } from '@/lib/api';
import { useSocketConnected } from '@/lib/socket';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { BarChart, MiniTimeline } from '@/components/Charts';
import { EmptyState, ErrorState, SkeletonStats } from '@/components/States';

export default function StatistikPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setStats(await fetchStatistics());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = [
    { label: 'Hari ini', value: stats?.today, hint: 'kejadian tercatat' },
    { label: '7 hari terakhir', value: stats?.last7d, hint: 'kejadian tercatat' },
    { label: '30 hari terakhir', value: stats?.last30d, hint: 'kejadian tercatat' },
    { label: 'Total tercatat', value: stats?.total, hint: 'seluruh histori' },
  ];

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Statistik Gempa"
      subtitle="Sumber data: BMKG"
    >
      {error && (
        <ErrorState
          title="Statistik tidak tersedia"
          message="Data statistik gagal dimuat karena sumber data BMKG tidak dapat dijangkau. Coba lagi nanti."
          onRetry={load}
        />
      )}
      {loading ? (
        <>
          <SkeletonStats />
          <div className="skeleton h-48 rounded-xl" aria-hidden="true" />
        </>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4" aria-label="Kartu statistik">
            {cards.map((c, i) => (
              <div
                key={c.label}
                className={`rounded-xl border bg-white p-4 shadow-card ${
                  i === 0 ? 'border-red-700/30 ring-1 ring-red-700/15' : 'border-slate-200'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
                  {c.value ?? '–'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{c.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5" aria-label="Distribusi magnitudo">
              <h2 className="text-sm font-bold text-slate-900">Distribusi magnitudo</h2>
              <p className="mb-3 text-xs text-slate-500">Seluruh data tercatat</p>
              <BarChart
                items={[
                  { label: '< 5 · Ringan', value: stats.magDistribution.minor_lt5 },
                  { label: '5–5,9 · Sedang', value: stats.magDistribution.moderate_5_59 },
                  { label: '≥ 6 · Kuat', value: stats.magDistribution.strong_gte6 },
                ]}
              />
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5" aria-label="Distribusi kedalaman">
              <h2 className="text-sm font-bold text-slate-900">Distribusi kedalaman</h2>
              <p className="mb-3 text-xs text-slate-500">Berdasarkan hiposenter</p>
              <BarChart
                barColor="#1d4ed8"
                items={[
                  { label: 'Dangkal < 70 km', value: stats.depthDistribution.shallow_lt70 },
                  { label: 'Menengah 70–300 km', value: stats.depthDistribution.intermediate_70_300 },
                  { label: 'Dalam > 300 km', value: stats.depthDistribution.deep_gt300 },
                ]}
              />
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5" aria-label="Wilayah teratas">
            <h2 className="text-sm font-bold text-slate-900">Wilayah dengan gempa terbanyak</h2>
            <p className="mb-3 text-xs text-slate-500">10 teratas dari data tercatat</p>
            {stats.topRegions.length > 0 ? (
              <BarChart
                barColor="#0f172a"
                items={stats.topRegions.slice(0, 10).map((r) => ({ label: r.region, value: r.count }))}
              />
            ) : (
              <p className="text-sm text-slate-500">Belum ada data wilayah.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5" aria-label="Linimasa 14 hari">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-slate-900">Linimasa 14 hari terakhir</h2>
              <span className="text-[11px] text-slate-400">jumlah kejadian / hari</span>
            </div>
            <div className="mt-1">
              {stats.timeline.length > 0 ? (
                <MiniTimeline items={stats.timeline.slice(-14)} />
              ) : (
                <p className="text-sm text-slate-500">Belum ada data linimasa.</p>
              )}
            </div>
          </section>
        </>
      ) : (
        !error && <EmptyState title="Belum ada data" message="Statistik belum tersedia." />
      )}
    </AppShell>
  );
}
