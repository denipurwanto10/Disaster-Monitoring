'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { fetchQuakeById, type Quake } from '@/lib/api';
import { useSocketConnected } from '@/lib/socket';
import { useUserLocation } from '@/lib/useUserLocation';
import { formatDistance, formatWaktu, haversineKm, magColor, magLabel } from '@/lib/geo';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { ErrorState } from '@/components/States';
import { tsunamiBadge } from '@/components/QuakeList';
import WatchButton from '@/components/WatchButton';
import { IconArrowRight, IconLocate } from '@/components/icons';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function QuakeDetailPage({ params }: { params: { id: string } }) {
  const [quake, setQuake] = useState<Quake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();
  const { location: userLoc, error: locError, loading: locLoading, request: requestLoc } = useUserLocation();

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setQuake(await fetchQuakeById(params.id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const dist =
    quake && userLoc ? haversineKm(userLoc.lat, userLoc.lon, quake.latitude, quake.longitude) : null;
  const m = quake ? Number(quake.magnitude) || 0 : 0;

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Detail Gempa"
      subtitle="Sumber data: BMKG"
      actions={
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-card transition-colors hover:bg-slate-50"
        >
          ← Kembali
        </Link>
      }
    >
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2" aria-hidden="true">
          <div className="skeleton h-72 rounded-xl" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
      )}
      {error && (
        <ErrorState
          title="Detail tidak tersedia"
          message="Data gempa tidak dapat dimuat. Mungkin data telah dihapus atau koneksi terputus."
          onRetry={load}
        />
      )}
      {quake && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5">
          <section
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-3"
            aria-label="Informasi gempa"
          >
            {/* Banner magnitudo */}
            <div className="flex items-center gap-4 bg-slate-900 px-4 py-4 text-white sm:px-5">
              <span
                className="inline-flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-xl text-3xl font-extrabold tabular-nums"
                style={{ background: magColor(m) }}
              >
                {m.toFixed(1)}
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {magLabel(m).split(' ')[0]}
                </span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold leading-snug sm:text-base">{quake.location}</p>
                <p className="mt-0.5 text-xs text-slate-300 sm:text-[13px]">
                  {formatWaktu(quake.event_time)} WIB · Kedalaman {quake.depth_km} km
                </p>
                <div className="mt-1.5">{tsunamiBadge(quake.tsunami_status)}</div>
                {quake.tsunami_status && !/tidak/i.test(quake.tsunami_status) && (
                  <Link
                    href="/tsunami"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-800 transition-colors hover:bg-red-100"
                  >
                    <span aria-hidden="true">🌊</span> Lihat status peringatan tsunami →
                  </Link>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm sm:grid-cols-3 sm:p-5">
              {[
                { k: 'Magnitudo', v: `M ${m.toFixed(1)} (${magLabel(m)})` },
                { k: 'Kedalaman', v: `${quake.depth_km} km` },
                { k: 'Waktu kejadian', v: `${formatWaktu(quake.event_time)} WIB` },
                { k: 'Lintang / Bujur', v: `${quake.latitude.toFixed(2)}, ${quake.longitude.toFixed(2)}` },
                { k: 'Dirasakan (MMI)', v: quake.felt || '–' },
                { k: 'Sumber data', v: quake.source || 'BMKG' },
              ].map((d) => (
                <div key={d.k} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d.k}</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{d.v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2.5 sm:col-span-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Wilayah</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{quake.location}</dd>
              </div>
              {quake.received_at && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Waktu diterima aplikasi
                  </dt>
                  <dd className="mt-0.5 text-[13px] text-slate-600">{formatWaktu(quake.received_at)} WIB</dd>
                </div>
              )}
              <div className="col-span-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 sm:col-span-3">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  <IconLocate className="h-3.5 w-3.5" /> Jarak dari lokasi Anda
                </dt>
                <dd className="mt-1 text-lg font-extrabold tabular-nums text-teal-900">
                  {dist != null ? (
                    formatDistance(dist)
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={requestLoc}
                        className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
                      >
                        {locLoading ? 'Mencari…' : 'Hitung jarak saya'}
                      </button>
                      {locError && <span className="text-xs font-normal text-amber-700">{locError}</span>}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {quake.shakemap_url && (
              <figure className="border-t border-slate-100 p-4 sm:p-5">
                <figcaption className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Peta guncangan (shakemap) BMKG
                </figcaption>
                <Image
                  src={quake.shakemap_url}
                  alt={`Peta guncangan gempa M ${m.toFixed(1)} di ${quake.location}`}
                  width={600}
                  height={400}
                  className="w-full rounded-xl border border-slate-200"
                  unoptimized
                />
              </figure>
            )}
          </section>

          <section
            aria-label="Peta lokasi gempa"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-2"
          >
            <div className="h-[300px] sm:h-[360px] lg:h-full lg:min-h-[480px]">
              <MapView
                quakes={[quake]}
                selectedId={quake.id}
                flyTarget={{ lat: quake.latitude, lon: quake.longitude, zoom: 7 }}
                userLocation={userLoc}
              />
            </div>
          </section>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              <WatchButton
                kind="quake"
                id={String(quake.id)}
                label={quake.location}
                sub={`M ${m.toFixed(1)} · ${formatWaktu(quake.event_time)} WIB`}
                href={`/gempa/${quake.id}`}
              />
              <Link
                href="/riwayat"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:underline"
              >
                Lihat riwayat gempa lain <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
