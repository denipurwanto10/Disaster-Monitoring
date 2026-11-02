'use client';

import Link from 'next/link';
import type { Volcano } from '@/lib/api';
import { volcanoLevelColor } from '@/lib/api';
import { formatWaktu } from '@/lib/geo';
import { IconArrowRight, IconTriangle, VolcanoMark } from './icons';
import { deep, stagger, tint } from './ui';

export function volcanoBadge(level: number, levelName?: string | null) {
  const label =
    levelName ?? (level >= 4 ? 'Awas' : level === 3 ? 'Siaga' : level === 2 ? 'Waspada' : 'Normal');
  const c = volcanoLevelColor(level);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-xs font-semibold"
      style={{ background: tint(c, 14), color: deep(c, 68), boxShadow: `inset 0 0 0 1px ${tint(c, 30)}` }}
    >
      <IconTriangle className="h-2.5 w-2.5" />
      <span>Level {level}</span>
      <span className="font-bold">{label}</span>
    </span>
  );
}

export function VolcanoListItem({
  v,
  selected,
  onSelect,
  index = 0,
}: {
  v: Volcano;
  selected?: boolean;
  onSelect?: (v: Volcano) => void;
  /** posisi dalam daftar — hanya untuk jeda animasi masuk */
  index?: number;
}) {
  const c = volcanoLevelColor(v.level);
  return (
    <li className="dm-enter" style={stagger(index)}>
      <div data-selected={selected ? 'true' : 'false'} className="dm-card dm-card-i group">
        <button
          type="button"
          onClick={() => onSelect?.(v)}
          aria-label={`Gunung ${v.name}, level ${v.level} ${v.level_name}`}
          aria-pressed={selected}
          className="dm-press flex w-full items-center gap-3.5 rounded-t-[10px] p-3.5 text-left"
        >
          <span
            className="inline-flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[11px]"
            style={{ background: tint(c, 15), color: deep(c, 70), boxShadow: `inset 0 0 0 1px ${tint(c, 32)}` }}
            title={`Level ${v.level} ${v.level_name}`}
            aria-hidden="true"
          >
            <VolcanoMark color={c} className="h-6 w-6" />
            <span className="text-[11px] font-bold leading-none tabular-nums">Lv {v.level}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--ink)]">
              Gunung {v.name}
            </span>
            <span className="dm-meta mt-0.5">
              <span className="truncate">{v.province}</span>
              {v.elevation_m != null && (
                <span className="tabular-nums">{v.elevation_m.toLocaleString('id-ID')} mdpl</span>
              )}
            </span>
          </span>
        </button>
        <div className="flex items-center justify-between border-t border-[color:var(--line-2)] px-3.5 py-2.5">
          {volcanoBadge(v.level, v.level_name)}
          <Link href={`/gunung-api/${v.slug}`} className="dm-link">
            Detail
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function VolcanoTable({ volcanoes }: { volcanoes: Volcano[] }) {
  return (
    <div className="dm-card dm-fade overflow-hidden">
      <div className="dm-table-wrap thin-scroll relative">
        <table className="dm-table v dm-table-min">
          <thead>
            <tr>
              <th scope="col">Gunung</th>
              <th scope="col">Provinsi</th>
              <th scope="col">Level</th>
              <th scope="col">Elevasi</th>
              <th scope="col" className="c-upd">Diperbarui</th>
              <th scope="col">
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {volcanoes.map((v) => (
              <tr key={v.slug} data-testid="volcano-row">
                <td className="c-name font-semibold text-[color:var(--ink)]">Gunung {v.name}</td>
                <td className="c-prov max-w-[220px] truncate text-[color:var(--ink-2)]" title={v.province}>
                  {v.province}
                </td>
                <td className="c-lvl whitespace-nowrap">{volcanoBadge(v.level, v.level_name)}</td>
                <td className="c-elev whitespace-nowrap tabular-nums text-[color:var(--ink-2)]">
                  {v.elevation_m != null ? `${v.elevation_m.toLocaleString('id-ID')} m` : '–'}
                </td>
                <td className="c-upd whitespace-nowrap text-xs text-[color:var(--ink-3)]">
                  {v.observed_at ? formatWaktu(v.observed_at) : '–'}
                </td>
                <td className="c-det whitespace-nowrap">
                  <Link href={`/gunung-api/${v.slug}`} className="dm-link">
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
