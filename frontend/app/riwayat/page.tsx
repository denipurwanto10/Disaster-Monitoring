'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fetchHistory, normalizeQuake, type Quake, type QuakeListMeta } from '@/lib/api';
import { useSocketConnected, useSocketEvent } from '@/lib/socket';
import { AppShell } from '@/components/AppShell';
import { useHealth } from '@/components/StatusBar';
import { EmptyState, ErrorState } from '@/components/States';
import { QuakeTable } from '@/components/QuakeList';
import { IconChevronDown, IconFilter } from '@/components/icons';

function useSyncedFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Memo: objek filters harus stabil antar-render. Tanpa ini, load() yang
  // bergantung pada `filters` akan terpicu ulang setiap render (loop request
  // tak berujung) hingga backend menolak via rate-limit → halaman error
  // padahal halaman lain baik-baik saja.
  const filters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      minMag: params.get('minMag') ?? '',
      maxMag: params.get('maxMag') ?? '',
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
      wilayah: params.get('wilayah') ?? '',
      page: params.get('page') ?? '1',
    }),
    [params],
  );
  const set = useCallback(
    (next: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([k, v]) => {
        if (v) sp.set(k, v);
        else sp.delete(k);
      });
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [params, pathname, router],
  );
  return { filters, set };
}

const inputCls =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-red-700 focus:bg-white focus:ring-2 focus:ring-red-700/15';

function HistoryInner() {
  const { filters, set } = useSyncedFilters();
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [meta, setMeta] = useState<QuakeListMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { health, error: healthError } = useHealth();
  const socketConnected = useSocketConnected();

  // Sinkronkan draft hanya ketika nilai filter di URL benar-benar berubah.
  const filterKey = [filters.q, filters.minMag, filters.maxMag, filters.from, filters.to, filters.wilayah, filters.page].join('|');
  useEffect(() => {
    setDraft(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchHistory({
        limit: 20,
        page: Number(filters.page) || 1,
        minMag: filters.minMag || undefined,
        maxMag: filters.maxMag || undefined,
        q: [filters.q, filters.wilayah].filter(Boolean).join(' ') || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sort: 'desc',
      });
      setQuakes(res.data);
      setMeta(res.meta);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent<Record<string, unknown>>('earthquake:new', (raw) => {
    try {
      const q = normalizeQuake(raw);
      setQuakes((prev) => {
        if (prev.some((x) => String(x.id) === String(q.id))) return prev;
        return [q, ...prev].slice(0, 60);
      });
      setHasNew(true);
    } catch {
      /* abaikan */
    }
  });

  const page = Number(filters.page) || 1;
  const activeFilterCount = [filters.q, filters.minMag, filters.maxMag, filters.from, filters.to, filters.wilayah].filter(Boolean).length;

  return (
    <AppShell
      health={health}
      fetchError={healthError}
      socketConnected={socketConnected}
      title="Riwayat Gempa"
      subtitle="Sumber data: BMKG · Waktu dalam WIB"
    >
      {/* Toolbar: pencarian cepat + toggle filter */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="min-w-0 flex-1 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            set({ ...draft, page: '1' });
          }}
          role="search"
        >
          <label htmlFor="riwayat-q" className="sr-only">Pencarian cepat</label>
          <input
            id="riwayat-q"
            type="search"
            value={draft.q}
            onChange={(e) => {
              const v = e.target.value;
              setDraft({ ...draft, q: v });
            }}
            onBlur={() => {
              if (draft.q !== filters.q) set({ ...draft, page: '1' });
            }}
            placeholder="Cari wilayah, mis. Malang…"
            aria-label="Pencarian cepat wilayah"
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-card outline-none transition-all placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/15"
          />
        </form>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="panel-filter"
          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold shadow-card transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <IconFilter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold tabular-nums text-white">
              {activeFilterCount}
            </span>
          )}
          <IconChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>
        {hasNew && (
          <button
            type="button"
            onClick={() => {
              setHasNew(false);
              load();
            }}
            className="animate-pulse rounded-full bg-red-700 px-3.5 py-2 text-xs font-bold text-white"
          >
            Ada gempa baru — muat ulang
          </button>
        )}
      </div>

      {filtersOpen && (
        <form
          id="panel-filter"
          aria-label="Filter riwayat gempa"
          className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-3 lg:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            set({ ...draft, page: '1' });
          }}
        >
          <label className="col-span-2 text-xs font-semibold text-slate-600 sm:col-span-1 lg:col-span-2">
            Pencarian
            <input
              type="search"
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              placeholder="Kata kunci…"
              aria-label="Pencarian kata kunci"
              className={inputCls}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Min M
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={draft.minMag}
              onChange={(e) => setDraft({ ...draft, minMag: e.target.value })}
              aria-label="Magnitudo minimum"
              placeholder="0"
              className={inputCls}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Maks M
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={draft.maxMag}
              onChange={(e) => setDraft({ ...draft, maxMag: e.target.value })}
              aria-label="Magnitudo maksimum"
              placeholder="10"
              className={inputCls}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Dari tanggal
            <input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              aria-label="Dari tanggal"
              className={inputCls}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Sampai tanggal
            <input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              aria-label="Sampai tanggal"
              className={inputCls}
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-slate-600 lg:col-span-3">
            Wilayah
            <input
              type="text"
              value={draft.wilayah}
              onChange={(e) => setDraft({ ...draft, wilayah: e.target.value })}
              placeholder="cth: Jawa Barat"
              aria-label="Filter wilayah"
              className={inputCls}
            />
          </label>
          <div className="col-span-2 flex items-end gap-2 lg:col-span-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 active:bg-red-900 sm:flex-none sm:px-6"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft({ q: '', minMag: '', maxMag: '', from: '', to: '', wilayah: '', page: '1' });
                set({ q: '', minMag: '', maxMag: '', from: '', to: '', wilayah: '', page: '' });
              }}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
            >
              Atur ulang
            </button>
          </div>
        </form>
      )}

      {error && (
        <ErrorState
          title="Data BMKG tidak tersedia"
          message="Riwayat gagal dimuat. Periksa koneksi internet Anda, lalu coba lagi."
          onRetry={load}
        />
      )}

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          <div className="skeleton h-4 w-56" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      ) : quakes.length > 0 ? (
        <>
          <p className="text-xs text-slate-500" role="status">
            Menampilkan <strong className="font-semibold text-slate-700">{quakes.length}</strong> dari{' '}
            <strong className="font-semibold text-slate-700">{meta.total}</strong> data · halaman {meta.page} dari{' '}
            {meta.totalPages || 1}
          </p>
          <QuakeTable quakes={quakes} />
          <nav aria-label="Navigasi halaman" className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-card sm:justify-start sm:gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => set({ ...filters, page: String(page - 1) })}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            <span className="text-sm tabular-nums text-slate-600" aria-live="polite">
              {page} / {meta.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={meta.totalPages > 0 && page >= meta.totalPages}
              onClick={() => set({ ...filters, page: String(page + 1) })}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </nav>
        </>
      ) : (
        !error && (
          <EmptyState title="Tidak ada hasil" message="Tidak ada gempa yang cocok dengan filter. Ubah filter lalu coba lagi." />
        )
      )}
    </AppShell>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat…</div>}>
      <HistoryInner />
    </Suspense>
  );
}
