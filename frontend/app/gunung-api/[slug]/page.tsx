'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchVolcanoBySlug, type Volcano } from '@/lib/api';
import { useSocketConnected } from '@/lib/socket';
import { formatWaktu } from '@/lib/geo';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { ErrorState } from '@/components/States';
import { volcanoBadge } from '@/components/VolcanoList';
import WatchButton from '@/components/WatchButton';
import { volcanoLevelColor } from '@/lib/api';
import { IconMountain } from '@/components/icons';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function VolcanoDetailPage({ params }: { params: { slug: string } }) {
  const [volcano, setVolcano] = useState<Volcano | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setVolcano(await fetchVolcanoBySlug(params.slug));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Detail Gunung Api"
      subtitle="Sumber data: MAGMA Indonesia (PVMBG–Badan Geologi)"
      actions={
        <Link
          href="/gunung-api"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-card transition-colors hover:bg-slate-50"
        >
          ← Kembali
        </Link>
      }
    >
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5" aria-hidden="true">
          <div className="skeleton h-72 rounded-xl lg:col-span-3" />
          <div className="skeleton h-72 rounded-xl lg:col-span-2" />
        </div>
      )}
      {error && (
        <ErrorState
          title="Detail tidak tersedia"
          message="Data gunung api tidak dapat dimuat. Mungkin data telah berubah atau koneksi terputus."
          onRetry={load}
        />
      )}
      {volcano && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5">
          <section
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-3"
            aria-label="Informasi gunung api"
          >
            <div className="flex items-center gap-4 bg-slate-900 px-4 py-4 text-white sm:px-5">
              <span
                className="inline-flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-xl"
                style={{ background: volcanoLevelColor(volcano.level) }}
                aria-hidden="true"
              >
                <span className="text-2xl leading-none">▲</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-90">
                  Level {volcano.level}
                </span>
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[15px] font-bold leading-snug sm:text-base">
                  <IconMountain className="h-4 w-4 shrink-0 text-slate-300" />
                  Gunung {volcano.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-300 sm:text-[13px]">{volcano.province}</p>
                <div className="mt-1.5">{volcanoBadge(volcano.level, volcano.level_name)}</div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2.5 p-4 text-sm sm:p-5">
              {[
                { k: 'Level aktivitas', v: `Level ${volcano.level} (${volcano.level_name})` },
                {
                  k: 'Elevasi',
                  v: volcano.elevation_m != null ? `${volcano.elevation_m.toLocaleString('id-ID')} mdpl` : '–',
                },
                {
                  k: 'Koordinat',
                  v:
                    volcano.latitude != null && volcano.longitude != null
                      ? `${volcano.latitude.toFixed(3)}, ${volcano.longitude.toFixed(3)}`
                      : '–',
                },
                {
                  k: 'Data diperbarui',
                  v: volcano.observed_at ? `${formatWaktu(volcano.observed_at)} WIB` : '–',
                },
              ].map((d) => (
                <div key={d.k} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d.k}</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{d.v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Provinsi</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{volcano.province}</dd>
              </div>
              <div className="col-span-2 flex flex-wrap gap-2">
                {volcano.report_url && (
                  <a
                    href={volcano.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-800"
                  >
                    Buka laporan MAGMA →
                  </a>
                )}
                <Link
                  href="/gunung-api"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Gunung api lain
                </Link>
                <WatchButton
                  kind="volcano"
                  id={volcano.slug}
                  label={volcano.name}
                  sub={volcano.province}
                  href={`/gunung-api/${volcano.slug}`}
                />
              </div>
              <p className="col-span-2 text-[11px] text-slate-400">
                Sumber data: MAGMA Indonesia (PVMBG–Badan Geologi, Kementerian ESDM). Status level dapat
                berubah sewaktu-waktu — ikuti arahan resmi PVMBG/BPBD setempat.
              </p>
            </dl>
          </section>

          <section
            aria-label="Peta lokasi gunung api"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-2"
          >
            <div className="h-[300px] sm:h-[360px] lg:h-full lg:min-h-[440px]">
              {volcano.latitude != null && volcano.longitude != null ? (
                <MapView
                  quakes={[]}
                  volcanoes={[volcano]}
                  selectedVolcanoSlug={volcano.slug}
                  flyTarget={{ lat: volcano.latitude, lon: volcano.longitude, zoom: 9 }}
                />
              ) : (
                <p className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                  Koordinat gunung ini belum tersedia.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
