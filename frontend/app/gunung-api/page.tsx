'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchVolcanoes, type Volcano, type VolcanoCounts } from '@/lib/api';
import { useSocketConnected } from '@/lib/socket';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { EmptyState, ErrorState, SkeletonList } from '@/components/States';
import { VolcanoTable, volcanoBadge } from '@/components/VolcanoList';
import { volcanoLevelColor } from '@/lib/api';
import { IconMountain } from '@/components/icons';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const LEVEL_FILTERS = [
  { value: 0, label: 'Semua' },
  { value: 4, label: 'Awas' },
  { value: 3, label: 'Siaga' },
  { value: 2, label: 'Waspada' },
  { value: 1, label: 'Normal' },
] as const;

export default function VolcanoPage() {
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const [counts, setCounts] = useState<VolcanoCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [level, setLevel] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Volcano | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchVolcanoes();
      setVolcanoes(res.data);
      setCounts(res.meta.counts);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return volcanoes.filter((v) => {
      if (level !== 0 && v.level !== level) return false;
      if (q && !`${v.name} ${v.province}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [volcanoes, level, query]);

  const mapped = useMemo(
    () => filtered.filter((v) => v.latitude != null && v.longitude != null),
    [filtered],
  );

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Gunung Api"
      subtitle="Sumber data: MAGMA Indonesia (PVMBG–Badan Geologi) · BMKG untuk gempa"
    >
      {error && (
        <ErrorState
          title="Data gunung api tidak tersedia"
          message="Tingkat aktivitas gunung api gagal dimuat. Periksa koneksi internet Anda, lalu coba lagi."
          onRetry={load}
        />
      )}

      {/* Kartu ringkasan level */}
      {loading ? (
        <div className="skeleton h-[92px] rounded-xl" aria-hidden="true" />
      ) : (
        counts && (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4" aria-label="Ringkasan level aktivitas">
            {[
              { lv: 4, label: 'Awas', value: counts.awas },
              { lv: 3, label: 'Siaga', value: counts.siaga },
              { lv: 2, label: 'Waspada', value: counts.waspada },
              { lv: 1, label: 'Normal', value: counts.normal },
            ].map((c) => (
              <button
                key={c.lv}
                type="button"
                onClick={() => setLevel((cur) => (cur === c.lv ? 0 : c.lv))}
                aria-pressed={level === c.lv}
                className={`rounded-xl border bg-white p-3.5 text-left shadow-card transition-all ${
                  level === c.lv ? 'border-red-700 ring-1 ring-red-700/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <span style={{ color: volcanoLevelColor(c.lv) }} aria-hidden="true">▲</span>
                  {c.label}
                </p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
                  {c.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">gunung api</p>
              </button>
            ))}
          </div>
        )
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3">
        <section aria-label="Peta gunung api" className="min-w-0 xl:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="h-[48vh] min-h-[300px] sm:h-[52vh] xl:h-[58vh]">
              <MapView
                quakes={[]}
                volcanoes={mapped}
                selectedVolcanoSlug={selected?.slug}
                flyTarget={flyTarget}
                onVolcanoClick={(v) => setSelected(v)}
              />
            </div>
          </div>

          {/* Filter + pencarian */}
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter level aktivitas">
              {LEVEL_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setLevel(f.value)}
                  aria-pressed={level === f.value}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    level === f.value
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 shadow-card hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <form
              className="min-w-0 flex-1 sm:max-w-xs"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
              <label htmlFor="gunung-q" className="sr-only">Cari gunung api</label>
              <input
                id="gunung-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / provinsi…"
                aria-label="Cari gunung api"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-card outline-none transition-all placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/15"
              />
            </form>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs text-slate-500" role="status">
              Menampilkan <strong className="font-semibold text-slate-700">{filtered.length}</strong> dari{' '}
              <strong className="font-semibold text-slate-700">{volcanoes.length}</strong> gunung api
            </p>
            {loading ? (
              <SkeletonList rows={6} />
            ) : filtered.length > 0 ? (
              <VolcanoTable volcanoes={filtered} />
            ) : (
              !error && (
                <EmptyState title="Tidak ada hasil" message="Tidak ada gunung api yang cocok dengan filter. Ubah filter lalu coba lagi." />
              )
            )}
          </div>
        </section>

        {/* Panel detail ringkas */}
        <section aria-label="Detail gunung terpilih" className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card xl:sticky xl:top-[68px]">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <IconMountain className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                {selected ? `Gunung ${selected.name}` : 'Pilih gunung api'}
              </h2>
            </div>
            <div className="p-4">
              {selected ? (
                <div className="space-y-3 text-sm">
                  <div>{volcanoBadge(selected.level, selected.level_name)}</div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Provinsi</dt>
                      <dd className="font-semibold text-slate-900">{selected.province}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Elevasi</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">
                          {selected.elevation_m != null ? `${selected.elevation_m.toLocaleString('id-ID')} m` : '–'}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Koordinat</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">
                          {selected.latitude != null && selected.longitude != null
                            ? `${selected.latitude.toFixed(2)}, ${selected.longitude.toFixed(2)}`
                            : '–'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => {
                      if (selected.latitude != null && selected.longitude != null) {
                        setFlyTarget({ lat: selected.latitude, lon: selected.longitude, zoom: 9 });
                      }
                    }}
                    className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                  >
                    Tampilkan di peta
                  </button>
                  {selected.report_url && (
                    <a
                      href={selected.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                    >
                      Buka laporan MAGMA →
                    </a>
                  )}
                  <p className="text-[11px] text-slate-400">Sumber data: MAGMA Indonesia (PVMBG–Badan Geologi)</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Klik marker segitiga di peta atau baris tabel untuk melihat ringkasan di sini.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
