'use client';

import { useEffect, useRef, useState } from 'react';
import { searchRegions, type RegionResult } from '@/lib/api';
import { IconPin, IconSearch } from './icons';

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
  const listRef = useRef<HTMLUListElement>(null);

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

  // jaga item yang disorot tetap terlihat saat navigasi keyboard
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${highlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const pick = (r: RegionResult) => {
    onSelect(r);
    setOpen(false);
    setQ(r.name);
  };

  return (
    <div ref={boxRef} className="relative w-full sm:w-60 lg:w-80">
      <label htmlFor="cari-wilayah" className="sr-only">
        Cari wilayah Indonesia
      </label>
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-4)] " />
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
        aria-activedescendant={open && results.length > 0 ? `wilayah-${highlight}` : undefined}
        className="peer h-10 w-full rounded-[var(--r-md)] border border-[color:var(--line)] bg-[color:var(--surface)] pl-9 pr-3 text-sm text-[color:var(--ink)] outline-none transition-[border-color,box-shadow,background-color] duration-300 placeholder:text-[color:var(--ink-4)] hover:border-[color:var(--ink-4)] focus:border-[color:var(--teal)] focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&::-webkit-search-cancel-button]:hidden"
      />
      {loading && (
        <span className="dm-spinner pointer-events-none absolute right-3 top-1/2 -mt-2" aria-hidden="true" />
      )}
      {open && (
        <ul
          ref={listRef}
          id="hasil-wilayah"
          className="dm-pop dm-float thin-scroll absolute z-50 mt-2 max-h-72 w-full min-w-[15rem] overflow-y-auto p-1.5"
          data-state="open"
          role="listbox"
          aria-label="Hasil pencarian wilayah"
        >
          {loading && <li className="px-3 py-2.5 text-sm text-[color:var(--ink-3)]">Mencari…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-[color:var(--ink-3)]">Wilayah tidak ditemukan.</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.name}-${i}`} id={`wilayah-${i}`} data-i={i} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 ${
                  i === highlight ? 'bg-[color:var(--teal-soft)]' : ''
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                    i === highlight ? 'bg-white text-[color:var(--teal)]' : 'bg-[color:var(--surface-2)] text-[color:var(--ink-3)]'
                  }`}
                >
                  <IconPin className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[color:var(--ink)]">{r.name}</span>
                  {r.province && <span className="block truncate text-xs text-[color:var(--ink-3)]">{r.province}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
