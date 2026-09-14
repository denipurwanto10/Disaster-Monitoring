'use client';

import { useEffect, useRef, useState } from 'react';
import { searchRegions, type RegionResult } from '@/lib/api';
import { IconSearch } from './icons';

export default function SearchRegion({
  onSelect,
}: {
  onSelect: (r: RegionResult) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<RegionResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchRegions(q.trim());
        setResults(r);
        setHighlight(0);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const pick = (r: RegionResult) => {
    onSelect(r);
    setOpen(false);
    setQ(r.name);
  };

  return (
    <div ref={boxRef} className="relative w-full sm:max-w-[220px] lg:max-w-xs">
      <label htmlFor="cari-wilayah" className="sr-only">
        Cari wilayah Indonesia
      </label>
      <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id="cari-wilayah"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => (h + 1) % results.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => (h - 1 + results.length) % results.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(results[highlight] ?? results[0]);
          }
        }}
        placeholder="Cari wilayah…"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="hasil-wilayah"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-800 shadow-inner outline-none transition-all placeholder:text-slate-400 focus:border-red-700 focus:bg-white focus:ring-2 focus:ring-red-700/15"
      />
      {open && (
        <ul
          id="hasil-wilayah"
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-pop"
          role="listbox"
          aria-label="Hasil pencarian wilayah"
        >
          {loading && <li className="px-3 py-2.5 text-sm text-slate-500">Mencari…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-slate-500">Wilayah tidak ditemukan.</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.name}-${i}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  i === highlight ? 'bg-red-50' : ''
                } hover:bg-slate-50`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">
                  {r.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{r.name}</span>
                  {r.province && <span className="block truncate text-xs text-slate-500">{r.province}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
