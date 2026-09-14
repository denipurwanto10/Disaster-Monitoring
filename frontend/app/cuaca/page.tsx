'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchAlerts,
  fetchForecast,
  fetchWeatherLocations,
  weatherSeverityColor,
  type Forecast,
  type WeatherAlert,
  type WeatherLocation,
} from '@/lib/api';
import { useSocketConnected } from '@/lib/socket';
import { formatTanggal } from '@/lib/geo';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { EmptyState, ErrorState, LoadingRow, SkeletonList } from '@/components/States';
import WatchButton from '@/components/WatchButton';
import { IconCloud } from '@/components/icons';

function slotTime(s: { local_datetime?: string; datetime?: string }): string {
  const raw = s.local_datetime ?? s.datetime ?? '';
  const m = raw.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d).replace('.', ':');
  }
  return raw || '–';
}

function severityLabel(s: WeatherAlert['severity']): string {
  if (s === 'high') return 'Tinggi';
  if (s === 'medium') return 'Sedang';
  return 'Rendah';
}

function severityDot(sev: WeatherAlert['severity']): string {
  if (sev === 'high') return 'bg-red-700';
  if (sev === 'medium') return 'bg-amber-600';
  return 'bg-green-700';
}

export default function CuacaPage() {
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState(false);
  const [selected, setSelected] = useState<WeatherLocation | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcError, setFcError] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [alerts, setAlerts] = useState<WeatherAlert[] | null>(null);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLocations = useCallback(async (q: string) => {
    setLocLoading(true);
    setLocError(false);
    try {
      const list = await fetchWeatherLocations(q);
      setLocations(list);
    } catch {
      // Endpoint belum ada — sembunyikan bagian pencarian, jangan crash.
      setLocations([]);
      setLocError(true);
    } finally {
      setLocLoading(false);
    }
  }, []);

  // Muat daftar kurasi (q='') + peringatan saat pertama dibuka.
  useEffect(() => {
    loadLocations('');
    fetchAlerts()
      .then((a) => setAlerts(a))
      .catch(() => setAlerts(null));
  }, [loadLocations]);

  // Debounce pencarian 400ms.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => loadLocations(query.trim()), 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, loadLocations]);

  const selectLocation = useCallback(async (loc: WeatherLocation) => {
    setSelected(loc);
    setActiveDay(0);
    setFcLoading(true);
    setFcError(false);
    setForecast(null);
    try {
      const f = await fetchForecast(loc.adm4);
      setForecast(f);
    } catch {
      setFcError(true);
    } finally {
      setFcLoading(false);
    }
  }, []);

  const day = forecast?.days[activeDay] ?? null;

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Cuaca"
      subtitle="Sumber data: BMKG (prakiraan cuaca & peringatan dini)"
    >
      {/* Peringatan dini aktif — di atas */}
      {alerts && alerts.length > 0 && (
        <section aria-label="Peringatan dini cuaca aktif">
          <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-card">
            <div className="flex items-center gap-2 border-b border-red-100 px-4 py-2.5">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
              <h2 className="text-sm font-bold text-red-900">
                Peringatan dini cuaca aktif ({alerts.length})
              </h2>
            </div>
            <ul className="divide-y divide-red-100">
              {alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${severityDot(a.severity)}`}
                    style={{ background: weatherSeverityColor(a.severity) }}
                  >
                    {severityLabel(a.severity)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.province}
                      {a.pub_date ? ` · ${formatTanggal(a.pub_date)}` : ''}
                      {a.description ? ` · ${a.description.slice(0, 90)}${a.description.length > 90 ? '…' : ''}` : ''}
                    </p>
                  </div>
                  {a.link && (
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-red-700 hover:underline"
                    >
                      Detail BMKG →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Pencarian lokasi */}
      <section aria-label="Cari lokasi prakiraan">
        <form onSubmit={(e) => e.preventDefault()} role="search">
          <label htmlFor="cuaca-q" className="sr-only">Cari desa / kelurahan</label>
          <input
            id="cuaca-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari desa / kelurahan… (mis. Sleman)"
            aria-label="Cari lokasi cuaca"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-card outline-none transition-all placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/15"
          />
        </form>
        <div className="mt-3">
          {locLoading ? (
            <SkeletonList rows={3} />
          ) : locations.length > 0 ? (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Hasil lokasi">
              {locations.slice(0, 8).map((l) => (
                <li key={l.adm4}>
                  <button
                    type="button"
                    onClick={() => selectLocation(l)}
                    aria-pressed={selected?.adm4 === l.adm4}
                    className={`w-full rounded-xl border bg-white px-4 py-2.5 text-left shadow-card transition-all ${
                      selected?.adm4 === l.adm4
                        ? 'border-red-700 ring-1 ring-red-700/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{l.desa}</p>
                    <p className="truncate text-xs text-slate-500">
                      {l.kecamatan}, {l.kotkab} · {l.provinsi}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : locError ? (
            <ErrorState
              title="Data cuaca tidak tersedia"
              message="Layanan prakiraan cuaca belum dapat dihubungi. Coba lagi nanti."
              onRetry={() => loadLocations(query.trim())}
            />
          ) : (
            <EmptyState
              title="Lokasi tidak ditemukan"
              message="Coba kata kunci lain, misalnya nama kecamatan atau kabupaten."
            />
          )}
        </div>
      </section>

      {/* Lokasi terpilih + prakiraan 3 hari */}
      {selected && (
        <section aria-label="Prakiraan cuaca lokasi terpilih">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <IconCloud className="h-4 w-4 text-slate-500" />
              <div className="mr-auto min-w-0">
                <h2 className="truncate text-sm font-bold text-slate-900">
                  {selected.desa}, {selected.kecamatan}
                </h2>
                <p className="truncate text-xs text-slate-500">
                  {selected.kotkab} · {selected.provinsi}
                </p>
              </div>
              <WatchButton
                kind="weather"
                id={selected.adm4}
                label={selected.desa}
                sub={`${selected.kecamatan}, ${selected.kotkab} · ${selected.provinsi}`}
                href="/cuaca"
              />
            </div>
            <div className="p-4">
              {fcLoading && <LoadingRow label="Memuat prakiraan…" />}
              {fcError && (
                <ErrorState
                  title="Prakiraan gagal dimuat"
                  message={`Prakiraan untuk ${selected.desa} belum dapat dimuat. Coba lagi nanti.`}
                  onRetry={() => selectLocation(selected)}
                />
              )}
              {forecast && forecast.days.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pilih hari prakiraan">
                    {forecast.days.slice(0, 3).map((d, i) => (
                      <button
                        key={`${d.date}-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={activeDay === i}
                        onClick={() => setActiveDay(i)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          activeDay === i
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {d.date ? formatTanggal(d.date) : `Hari ${i + 1}`}
                      </button>
                    ))}
                  </div>
                  {day && (
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
                      {day.slots.map((s, i) => (
                        <li
                          key={`${s.local_datetime ?? s.datetime ?? i}`}
                          className="rounded-xl border border-slate-200 bg-white p-3 shadow-card"
                        >
                          <p className="text-xs font-extrabold tabular-nums text-slate-900">{slotTime(s)}</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {s.weather_desc ?? '–'}
                          </p>
                          <dl className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Suhu</dt>
                              <dd className="font-bold tabular-nums text-slate-900">{s.t != null ? `${s.t}°C` : '–'}</dd>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kelembapan</dt>
                              <dd className="font-bold tabular-nums text-slate-900">{s.hu != null ? `${s.hu}%` : '–'}</dd>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Angin</dt>
                              <dd className="font-bold tabular-nums text-slate-900">
                                {s.ws != null ? `${s.ws} m/s${s.wd ? ` ${s.wd}` : ''}` : '–'}
                              </dd>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hujan</dt>
                              <dd className="font-bold tabular-nums text-slate-900">{s.tp != null ? `${s.tp} mm` : '–'}</dd>
                            </div>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                  {forecast.analysis_date && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Analisis: {formatTanggal(forecast.analysis_date)} WIB
                    </p>
                  )}
                </>
              )}
              {forecast && forecast.days.length === 0 && !fcLoading && (
                <EmptyState title="Belum ada prakiraan" message="Prakiraan untuk lokasi ini belum tersedia." />
              )}
            </div>
          </div>
        </section>
      )}

      {!selected && !locLoading && locations.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          Pilih salah satu lokasi di atas untuk melihat prakiraan cuacanya, lalu gunakan tombol Pantau untuk menyimpannya.
        </p>
      )}
      <p className="text-center text-[11px] text-slate-400">
        Butuh tautan cepat? <Link href="/gunung-api" className="font-semibold text-red-700 hover:underline">Lihat gunung api</Link>
      </p>
    </AppShell>
  );
}
