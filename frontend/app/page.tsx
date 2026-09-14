'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchAlerts, fetchQuakes, fetchStatistics, fetchTsunami, fetchVolcanoLevels, normalizeQuake, type Quake, type RegionResult, type Statistics, type VolcanoCounts } from '@/lib/api';
import { useNotifyPermission, useSocketConnected, useSocketEvent } from '@/lib/socket';
import { useUserLocation } from '@/lib/useUserLocation';
import { formatDistance, haversineKm, magColor } from '@/lib/geo';
import { AppShell } from '@/components/AppShell';
import StatusBar, { useHealth } from '@/components/StatusBar';
import SearchRegion from '@/components/SearchRegion';
import NotificationCenter, { pushBrowserNotification, type Toast } from '@/components/NotificationCenter';
import { MiniTimeline } from '@/components/Charts';
import { EmptyState, ErrorState, SkeletonList, SkeletonStats } from '@/components/States';
import { QuakeListItem, QuakeTable } from '@/components/QuakeList';
import { IconArrowRight, IconLocate, IconMountain, IconPulse } from '@/components/icons';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

let toastId = 1;

export default function DashboardPage() {
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [volcanoCounts, setVolcanoCounts] = useState<VolcanoCounts | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [tsunamiCount, setTsunamiCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Quake | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nearby, setNearby] = useState<{ region: RegionResult; items: { q: Quake; km: number }[] } | null>(null);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();
  const { location: userLoc, error: locError, loading: locLoading, request: requestLoc } = useUserLocation();
  const { permission, request: requestNotify } = useNotifyPermission();
  const seenRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [q, s] = await Promise.all([
        fetchQuakes({ limit: 30, sort: 'desc' }),
        fetchStatistics().catch(() => null),
      ]);
      setQuakes(q.data);
      setStats(s);
      q.data.forEach((x) => seenRef.current.add(String(x.id)));
      // Strip gunung api: opsional, sembunyikan bila endpoint belum ada.
      fetchVolcanoLevels()
        .then((v) => setVolcanoCounts(v.counts))
        .catch(() => setVolcanoCounts(null));
      // Banner peringatan dini cuaca: opsional, gagal diam-diam.
      fetchAlerts()
        .then((a) => setAlertCount(a.length))
        .catch(() => setAlertCount(null));
      // Banner tsunami InaTEWS: hanya bila ada buletin ≤ 7 hari (buletin lama = arsip, bukan darurat).
      fetchTsunami()
        .then((t) => {
          const week = Date.now() - 7 * 864e5;
          const fresh = t.data.filter((e) => {
            const ms = new Date(e.event_time).getTime();
            return Number.isFinite(ms) && ms >= week;
          });
          setTsunamiCount(fresh.length > 0 ? fresh.length : null);
        })
        .catch(() => setTsunamiCount(null));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await fetchStatistics());
    } catch {
      /* statistik boleh gagal diam-diam */
    }
  }, []);

  useSocketEvent<Record<string, unknown>>('earthquake:new', (raw) => {
    try {
      const q = normalizeQuake(raw);
      const key = String(q.id || q.external_id || q.event_time);
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      setQuakes((prev) => [q, ...prev].slice(0, 60));
      setHasNew(true);
      refreshStats();
      const m = Number(q.magnitude) || 0;
      const tsunami = String(q.tsunami_status ?? '').toLowerCase().includes('potensi');
      if (m >= 5 || tsunami) {
        const toast: Toast = {
          id: toastId++,
          title: `Gempa M ${m.toFixed(1)} — ${q.location}`,
          message: tsunami ? 'Berpotensi tsunami. Ikuti arahan BMKG/BNPB.' : `Kedalaman ${q.depth_km} km.`,
        };
        setToasts((p) => [toast, ...p].slice(0, 10));
        pushBrowserNotification(toast.title, toast.message);
      }
    } catch {
      /* abaikan payload rusak */
    }
  });

  useSocketEvent<{ bmkg?: string; lastSyncAt?: string; lastSuccessAt?: string }>('status:update', () => {
    // StatusBar membaca via polling /health; event ini cukup memicu tak ada aksi.
  });

  const onRegionSelect = useCallback(
    (r: RegionResult) => {
      setFlyTarget({ lat: r.latitude, lon: r.longitude, zoom: 8 });
      const items = quakes
        .map((q) => ({ q, km: haversineKm(r.latitude, r.longitude, q.latitude, q.longitude) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 5);
      setNearby({ region: r, items });
    },
    [quakes],
  );

  const list = useMemo(() => quakes.slice(0, 10), [quakes]);
  const table5 = useMemo(() => quakes.slice(0, 5), [quakes]);
  const latest = quakes[0] ?? null;
  const latestMag = latest ? Number(latest.magnitude) || 0 : 0;

  const strongest30 = useMemo(() => {
    if (stats?.strongest30d) return stats.strongest30d;
    return quakes.reduce<{ magnitude: number; location?: string } | null>(
      (acc, q) => (!acc || q.magnitude > acc.magnitude ? { magnitude: q.magnitude, location: q.location } : acc),
      null,
    );
  }, [stats, quakes]);

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Pantauan Gempa"
      subtitle="Sumber data: BMKG · Waktu dalam WIB"
      actions={
        <>
          <SearchRegion onSelect={onRegionSelect} />
          <button
            type="button"
            onClick={requestLoc}
            aria-label="Tampilkan lokasi saya"
            title="Tampilkan lokasi saya"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-card transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <IconLocate className="h-5 w-5" />
            <span className="sr-only">{locLoading ? 'Mencari lokasi…' : 'Lokasi saya'}</span>
          </button>
          <NotificationCenter
            toasts={toasts}
            permission={permission}
            onEnable={requestNotify}
            onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
          />
          <div className="hidden lg:block">
            <StatusBar health={health} fetchError={healthError} socketConnected={socketConnected} />
          </div>
        </>
      }
    >
      <div className="flex items-center gap-2 lg:hidden">
        <StatusBar health={health} fetchError={healthError} socketConnected={socketConnected} />
      </div>
      {locError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800" role="status">
          {locError}
        </p>
      )}
      {loadError && (
        <ErrorState
          title="Data BMKG tidak tersedia"
          message="Koneksi ke server data gagal. Periksa jaringan Anda, lalu coba lagi. Data terakhir yang tersimpan tetap dapat dilihat setelah koneksi pulih."
          onRetry={load}
        />
      )}

      {/* Sorotan gempa terbaru + status gunung api */}
      {tsunamiCount != null && tsunamiCount > 0 && (
        <Link
          href="/tsunami"
          className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-2.5 text-sm font-bold text-red-900 shadow-card transition-colors hover:bg-red-200"
        >
          <span aria-hidden="true">🌊</span>
          <span className="min-w-0 flex-1 truncate">
            {tsunamiCount} buletin tsunami ≤ 7 hari (InaTEWS) — Lihat →
          </span>
        </Link>
      )}
      {alertCount != null && alertCount > 0 && (
        <Link
          href="/cuaca"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 shadow-card transition-colors hover:bg-red-100"
        >
          <span aria-hidden="true">⚠</span>
          <span className="min-w-0 flex-1 truncate">
            {alertCount} peringatan dini cuaca aktif (BMKG) — Lihat →
          </span>
        </Link>
      )}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {loading ? (
            <div className="skeleton h-[76px] rounded-xl" aria-hidden="true" />
          ) : latest ? (
        <section
          aria-label="Gempa terbaru"
          className="flex items-center gap-3 overflow-hidden rounded-xl bg-slate-900 px-4 py-3 text-white shadow-card sm:gap-4 sm:px-5"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span
            className="inline-flex h-11 min-w-14 shrink-0 items-center justify-center rounded-lg px-2 text-lg font-extrabold tabular-nums"
            style={{ background: magColor(latestMag) }}
          >
            {latestMag.toFixed(1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              <IconPulse className="h-3.5 w-3.5" />
              Gempa terbaru
            </p>
            <p className="truncate text-sm font-semibold sm:text-[15px]">{latest.location}</p>
          </div>
          <Link
            href={`/gempa/${latest.id}`}
            className="hidden shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/20 sm:inline-flex"
          >
            Detail <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
          </section>
        ) : null}
        </div>
        {/* Strip status gunung api — disembunyikan bila endpoint belum tersedia */}
        {volcanoCounts && (
          <Link
            href="/gunung-api"
            aria-label="Lihat status gunung api"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card transition-all hover:border-slate-300 hover:shadow-pop"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <IconMountain className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Gunung api
              </span>
              <span className="block truncate text-sm font-semibold text-slate-900">
                Siaga {volcanoCounts.siaga} · Waspada {volcanoCounts.waspada}
                {volcanoCounts.awas > 0 ? ` · Awas ${volcanoCounts.awas}` : ''}
              </span>
            </span>
            <IconArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3">
        <section aria-label="Peta sebaran gempa" className="min-w-0 xl:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="h-[52vh] min-h-[320px] sm:h-[56vh] xl:h-[62vh]">
              <MapView
                quakes={quakes}
                selectedId={selected?.id}
                flyTarget={flyTarget}
                userLocation={userLoc}
                onMarkerClick={(q) => {
                  setSelected(q);
                  setFlyTarget({ lat: q.latitude, lon: q.longitude, zoom: 7 });
                }}
              />
            </div>
            {nearby && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-bold text-slate-800">
                  Terdekat dari {nearby.region.name}
                  {nearby.region.province ? `, ${nearby.region.province}` : ''}:
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {nearby.items.map(({ q, km }) => (
                    <li key={String(q.id)} className="flex items-center gap-2">
                      <span
                        className="inline-flex min-w-9 items-center justify-center rounded px-1 py-0.5 text-[11px] font-extrabold tabular-nums text-white"
                        style={{ background: magColor(Number(q.magnitude) || 0) }}
                      >
                        {Number(q.magnitude).toFixed(1)}
                      </span>
                      <Link href={`/gempa/${q.id}`} className="min-w-0 flex-1 truncate hover:text-red-700 hover:underline">
                        {q.location}
                      </Link>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-500">{formatDistance(km)}</span>
                    </li>
                  ))}
                  {nearby.items.length === 0 && <li>Belum ada data gempa.</li>}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 lg:grid-cols-4" aria-label="Ringkasan statistik">
            {loading ? (
              <div className="col-span-2 lg:col-span-4">
                <SkeletonStats />
              </div>
            ) : (
              [
                { label: 'Hari ini', value: stats?.today, hint: 'kejadian' },
                { label: '7 hari', value: stats?.last7d, hint: 'kejadian' },
                { label: '30 hari', value: stats?.last30d, hint: 'kejadian' },
                {
                  label: 'Terkuat 30 hari',
                  value: strongest30 ? `M ${Number(strongest30.magnitude).toFixed(1)}` : undefined,
                  hint: strongest30?.location?.split(',')[0] ?? '',
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
                    {s.value ?? '–'}
                  </p>
                  {s.hint !== '' && <p className="mt-0.5 truncate text-[11px] text-slate-500">{s.hint}</p>}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:mt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-slate-900">Linimasa 14 hari terakhir</h2>
              <span className="text-[11px] text-slate-400">jumlah kejadian / hari</span>
            </div>
            <div className="mt-1">
              {stats?.timeline?.length ? (
                <MiniTimeline items={stats.timeline.slice(-14)} />
              ) : (
                <p className="mt-1 text-sm text-slate-500">{loading ? 'Memuat…' : 'Belum ada data linimasa.'}</p>
              )}
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">5 gempa terakhir</h2>
              <Link
                href="/riwayat"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
              >
                Lihat semua <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {table5.length > 0 ? (
              <QuakeTable quakes={table5} compact />
            ) : loading ? (
              <div className="skeleton h-40 rounded-xl" aria-hidden="true" />
            ) : (
              <EmptyState title="Belum ada data" message="Belum ada gempa tercatat." />
            )}
          </div>
        </section>

        <section aria-label="Daftar gempa terbaru" className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card xl:sticky xl:top-[68px]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Gempa Terbaru</h2>
              {hasNew && (
                <button
                  type="button"
                  onClick={() => setHasNew(false)}
                  className="animate-pulse rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white"
                  aria-label="Tandai gempa baru sudah dilihat"
                >
                  Ada gempa baru
                </button>
              )}
            </div>
            <ul className="thin-scroll max-h-[50vh] space-y-2 overflow-y-auto p-3 sm:max-h-[60vh] xl:max-h-[calc(62vh-57px)]">
              {loading && list.length === 0 && <SkeletonList rows={5} />}
              {list.map((q) => (
                <QuakeListItem
                  key={String(q.id)}
                  q={q}
                  selected={!!selected && String(selected.id) === String(q.id)}
                  userLocation={userLoc}
                  onSelect={(x) => {
                    setSelected(x);
                    setFlyTarget({ lat: x.latitude, lon: x.longitude, zoom: 7 });
                    setHasNew(false);
                  }}
                />
              ))}
              {!loading && list.length === 0 && !loadError && (
                <li>
                  <EmptyState title="Belum ada data" message="Belum ada gempa tercatat. Coba muat ulang nanti." />
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
