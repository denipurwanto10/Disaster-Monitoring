'use client';

import Link from 'next/link';
import type { Volcano } from '@/lib/api';
import { volcanoLevelColor } from '@/lib/api';
import { formatWaktu } from '@/lib/geo';

export function volcanoBadge(level: number, levelName?: string | null) {
  const label =
    levelName ?? (level >= 4 ? 'Awas' : level === 3 ? 'Siaga' : level === 2 ? 'Waspada' : 'Normal');
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ background: volcanoLevelColor(level) }}
    >
      <span aria-hidden="true">▲</span> Level {level} · {label}
    </span>
  );
}

export function VolcanoListItem({
  v,
  selected,
  onSelect,
}: {
  v: Volcano;
  selected?: boolean;
  onSelect?: (v: Volcano) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(v)}
        aria-label={`Gunung ${v.name}, level ${v.level} ${v.level_name}`}
        className={`group block w-full rounded-xl border p-3 text-left transition-all ${
          selected
            ? 'border-red-700 bg-red-50/60 shadow-card'
            : 'border-slate-200 bg-white shadow-card hover:border-slate-300 hover:shadow-pop'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-white"
            style={{ background: volcanoLevelColor(v.level) }}
            title={`Level ${v.level} ${v.level_name}`}
            aria-hidden="true"
          >
            <span className="text-base leading-none">▲</span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide opacity-90">
              Lv {v.level}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">Gunung {v.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {v.province}
              {v.elevation_m != null ? ` · ${v.elevation_m.toLocaleString('id-ID')} mdpl` : ''}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
          {volcanoBadge(v.level, v.level_name)}
          <Link
            href={`/gunung-api/${v.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 group-hover:underline"
          >
            Detail →
          </Link>
        </div>
      </button>
    </li>
  );
}

export function VolcanoTable({ volcanoes }: { volcanoes: Volcano[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-200">
              <th scope="col" className="px-4 py-3 font-semibold">Gunung</th>
              <th scope="col" className="px-4 py-3 font-semibold">Provinsi</th>
              <th scope="col" className="px-4 py-3 font-semibold">Level</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Elevasi</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Diperbarui</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {volcanoes.map((v, i) => (
              <tr
                key={v.slug}
                data-testid="volcano-row"
                className={`transition-colors hover:bg-red-50/40 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}
              >
                <td className="px-4 py-2.5 font-semibold text-slate-900">Gunung {v.name}</td>
                <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-600" title={v.province}>
                  {v.province}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{volcanoBadge(v.level, v.level_name)}</td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600 md:table-cell">
                  {v.elevation_m != null ? `${v.elevation_m.toLocaleString('id-ID')} m` : '–'}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-slate-500 lg:table-cell">
                  {v.observed_at ? formatWaktu(v.observed_at) : '–'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <Link
                    href={`/gunung-api/${v.slug}`}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 hover:underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
