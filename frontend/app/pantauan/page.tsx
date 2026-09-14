'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { EmptyState, LoadingRow } from '@/components/States';
import { useNotifyPermission, useSocketConnected } from '@/lib/socket';
import { fetchAlerts, fetchQuakes, fetchVolcanoes } from '@/lib/api';
import { getWatchlist, removeWatch, type WatchItem, type WatchKind } from '@/lib/watchlist';
import { volcanoLevelColor } from '@/lib/api';

const GROUPS: { kind: WatchKind; title: string }[] = [
  { kind: 'volcano', title: 'Gunung api' },
  { kind: 'weather', title: 'Cuaca' },
  { kind: 'quake', title: 'Gempa' },
];

const GROUP_LABEL: Record<WatchKind, string> = {
  volcano: 'Gunung api',
  weather: 'Cuaca',
  quake: 'Gempa',
};

export default function PantauanPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [volcanoLevels, setVolcanoLevels] = useState<Record<string, { level: number; name: string }>>({});
  const [alertProvinceCount, setAlertProvinceCount] = useState<Record<string, number>>({});
  const [quakeCount, setQuakeCount] = useState<number | null>(null);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();
  const { permission, request: requestNotify } = useNotifyPermission();

  useEffect(() => {
    setItems(getWatchlist());
    setLoaded(true);
    // Status pantauan — semua gagal diam-diam (catch → null).
    fetchVolcanoes()
      .then((v) => {
        const map: Record<string, { level: number; name: string }> = {};
        for (const x of v.data) map[x.slug] = { level: x.level, name: x.level_name };
        setVolcanoLevels(map);
      })
      .catch(() => null);
    fetchAlerts()
      .then((alerts) => {
        const map: Record<string, number> = {};
        for (const a of alerts) {
          const prov = a.province.trim().toLowerCase();
          map[prov] = (map[prov] ?? 0) + 1;
        }
        setAlertProvinceCount(map);
      })
      .catch(() => null);
    fetchQuakes({ limit: 10, sort: 'desc' })
      .then((q) => setQuakeCount(q.data.length))
      .catch(() => setQuakeCount(null));
  }, []);

  const remove = (kind: WatchKind, id: string) => {
    setItems(removeWatch(kind, id));
  };

  const weatherMatch = (item: WatchItem): number | null => {
    // Cocokkan pantauan cuaca berdasarkan provinsi yang disebut di sub/label.
    const hay = `${item.label} ${item.sub ?? ''}`.toLowerCase();
    let total = 0;
    let matched = false;
    for (const [prov, n] of Object.entries(alertProvinceCount)) {
      if (prov && prov !== '-' && hay.includes(prov)) {
        total += n;
        matched = true;
      }
    }
    return matched ? total : null;
  };

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Pantauan saya"
      subtitle="Daftar pantauan tersimpan di perangkat ini (localStorage)"
      actions={
        permission !== 'granted' && permission !== 'unsupported' ? (
          <button
            type="button"
            onClick={requestNotify}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Aktifkan notifikasi
          </button>
        ) : undefined
      }
    >
      <section aria-label="Notifikasi browser" className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Notifikasi browser untuk peringatan baru</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {permission === 'granted'
                ? 'Notifikasi browser sudah aktif di perangkat ini.'
                : permission === 'unsupported'
                  ? 'Peramban ini tidak mendukung notifikasi.'
                  : 'Aktifkan agar peringatan gempa besar tampil walau tab tidak fokus.'}{' '}
              Pantauan tersimpan otomatis di perangkat ini.
            </p>
          </div>
          {permission !== 'granted' && permission !== 'unsupported' && (
            <button
              type="button"
              onClick={requestNotify}
              className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-800"
            >
              Minta izin notifikasi
            </button>
          )}
        </div>
      </section>

      {!loaded && <LoadingRow label="Memuat pantauan…" />}

      {loaded && items.length === 0 && (
        <EmptyState
          title="Belum ada pantauan"
          message="Anda belum memantau apa pun. Bintang lokasi favorit agar cepat diakses dari sini."
        />
      )}
      {loaded && items.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gunung-api"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Jelajahi gunung api
          </Link>
          <Link
            href="/cuaca"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-card transition-colors hover:bg-slate-50"
          >
            Cari prakiraan cuaca
          </Link>
        </div>
      )}

      {loaded && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3">
          {GROUPS.map((g) => {
            const list = items.filter((w) => w.kind === g.kind);
            if (list.length === 0) return null;
            return (
              <section
                key={g.kind}
                aria-label={`Pantauan ${g.title}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
              >
                <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <h2 className="text-sm font-bold text-slate-900">
                    {g.title} ({list.length})
                  </h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {list.map((w) => (
                    <li key={`${w.kind}:${w.id}`} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link href={w.href} className="block truncate text-sm font-semibold text-slate-900 hover:text-red-700 hover:underline">
                          {w.label}
                        </Link>
                        {w.sub && <p className="truncate text-xs text-slate-500">{w.sub}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(w.kind, w.id)}
                        aria-label={`Hapus pantauan ${w.label}`}
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {loaded && items.length > 0 && (
        <section aria-label="Status pantauan" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
            <h2 className="text-sm font-bold text-slate-900">Status pantauan</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((w) => (
              <li key={`status:${w.kind}:${w.id}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {GROUP_LABEL[w.kind]}
                </span>
                <Link href={w.href} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 hover:text-red-700 hover:underline">
                  {w.label}
                </Link>
                {w.kind === 'volcano' && volcanoLevels[w.id] && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ background: volcanoLevelColor(volcanoLevels[w.id].level) }}
                  >
                    Level {volcanoLevels[w.id].level} · {volcanoLevels[w.id].name}
                  </span>
                )}
                {w.kind === 'weather' &&
                  (() => {
                    const n = weatherMatch(w);
                    return n != null && n > 0 ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">
                        {n} peringatan aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-800">
                        Tidak ada peringatan
                      </span>
                    );
                  })()}
                {w.kind === 'quake' && (
                  quakeCount != null ? (
                    <Link href="/riwayat" className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:underline">
                      {quakeCount} gempa terbaru tersedia
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-400">Gempa kedaluwarsa — lihat riwayat</span>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
