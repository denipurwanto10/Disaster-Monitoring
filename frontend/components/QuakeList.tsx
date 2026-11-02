'use client';

import Link from 'next/link';
import type { Quake } from '@/lib/api';
import { formatDistance, formatWaktu, haversineKm, magColor } from '@/lib/geo';
import { IconArrowRight } from './icons';
import { deep, stagger, tint } from './ui';

export function tsunamiBadge(status?: string | null, compact = false) {
  const s = (status ?? '').toLowerCase();
  // "Tidak berpotensi tsunami" juga mengandung kata "potensi" — harus dikecualikan
  const potensi = (s.includes('potensi') || s.includes('berpotensi')) && !/\b(tidak|bukan)\b/.test(s);
  if (potensi) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--danger)] px-2.5 py-1 text-xs font-semibold text-white">
        <span className="dm-breathe h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        {compact ? 'Tsunami' : 'Berpotensi tsunami'}
      </span>
    );
  }
  // Status aman sengaja dibuat tenang: tanpa latar, hanya titik hijau.
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--ink-3)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ok)]" aria-hidden="true" />
      {compact ? 'Aman' : 'Tidak berpotensi tsunami'}
    </span>
  );
}

function MagTile({ m, size = 'lg' }: { m: number; size?: 'lg' | 'sm' }) {
  const c = magColor(m);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold tabular-nums leading-none tracking-[-0.03em] ${
        size === 'lg' ? 'h-[52px] w-[52px] rounded-[11px] text-[22px]' : 'h-9 min-w-[2.75rem] rounded-lg px-2 text-[15px]'
      }`}
      style={{ background: tint(c, 15), color: deep(c, 70), boxShadow: `inset 0 0 0 1px ${tint(c, 32)}` }}
      title={`Magnitudo ${m.toFixed(1)}`}
    >
      {m.toFixed(1)}
    </span>
  );
}

export function QuakeListItem({
  q,
  selected,
  userLocation,
  onSelect,
  index = 0,
}: {
  q: Quake;
  selected?: boolean;
  userLocation?: { lat: number; lon: number } | null;
  onSelect?: (q: Quake) => void;
  /** posisi dalam daftar — hanya untuk jeda animasi masuk */
  index?: number;
}) {
  const m = Number(q.magnitude) || 0;
  const dist =
    userLocation != null ? haversineKm(userLocation.lat, userLocation.lon, q.latitude, q.longitude) : null;
  return (
    <li className="dm-enter" style={stagger(index)}>
      <div data-selected={selected ? 'true' : 'false'} className="dm-card dm-card-i group">
        <button
          type="button"
          onClick={() => onSelect?.(q)}
          aria-label={`Gempa M ${m.toFixed(1)} di ${q.location}`}
          aria-pressed={selected}
          className="dm-press flex w-full items-center gap-3.5 rounded-t-[10px] p-3.5 text-left"
        >
          <MagTile m={m} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--ink)]">
              {q.location}
            </span>
            <span className="dm-meta mt-0.5">
              <span className="tabular-nums">{formatWaktu(q.event_time)} WIB</span>
              <span className="tabular-nums">{q.depth_km} km</span>
            </span>
            {dist != null && (
              <span className="mt-0.5 block text-[13px] font-semibold tabular-nums text-[color:var(--teal)]">
                {formatDistance(dist)} dari Anda
              </span>
            )}
          </span>
        </button>
        <div className="flex items-center justify-between border-t border-[color:var(--line-2)] px-3.5 py-2.5">
          {tsunamiBadge(q.tsunami_status, true)}
          <Link href={`/gempa/${q.id}`} className="dm-link">
            Detail
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function QuakeTable({ quakes, compact = false }: { quakes: Quake[]; compact?: boolean }) {
  // `compact` dipertahankan demi kompatibilitas: kolom kedalaman kini selalu tampil
  void compact;
  return (
    <div className="dm-card dm-fade overflow-hidden">
      <div className="dm-table-wrap thin-scroll relative overflow-x-auto">
        <table className="dm-table q dm-table-min">
          <thead>
            <tr>
              <th scope="col" className="c-time">Waktu (WIB)</th>
              <th scope="col" className="c-mag">M</th>
              <th scope="col" className="c-depth">Kedalaman</th>
              <th scope="col" className="c-loc">Wilayah</th>
              <th scope="col" className="c-coord">Koordinat</th>
              <th scope="col" className="c-tsu">Tsunami</th>
              <th scope="col" className="c-det">
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {quakes.map((q) => (
              <tr key={String(q.id)} data-testid="quake-row">
                <td className="c-time whitespace-nowrap tabular-nums text-[color:var(--ink-2)]">
                  {formatWaktu(q.event_time)}
                </td>
                <td className="c-mag">
                  <MagTile m={Number(q.magnitude) || 0} size="sm" />
                </td>
                <td className="c-depth whitespace-nowrap tabular-nums text-[color:var(--ink-2)]">{q.depth_km} km</td>
                <td
                  className="c-loc max-w-[260px] truncate font-medium text-[color:var(--ink)]"
                  title={q.location}
                >
                  {q.location}
                </td>
                <td className="c-coord whitespace-nowrap text-xs tabular-nums text-[color:var(--ink-3)]">
                  {q.latitude.toFixed(2)}, {q.longitude.toFixed(2)}
                </td>
                <td className="c-tsu whitespace-nowrap">{tsunamiBadge(q.tsunami_status, true)}</td>
                <td className="c-det whitespace-nowrap">
                  <Link href={`/gempa/${q.id}`} className="dm-link">
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
