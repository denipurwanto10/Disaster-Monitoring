'use client';

import Link from 'next/link';
import type { Quake } from '@/lib/api';
import { formatDistance, formatWaktu, haversineKm, magColor } from '@/lib/geo';

export function tsunamiBadge(status?: string | null, compact = false) {
  const s = (status ?? '').toLowerCase();
  const potensi = s.includes('potensi') || s.includes('berpotensi');
  if (potensi) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-700 px-2.5 py-0.5 text-[11px] font-bold text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        {compact ? 'Tsunami' : 'Berpotensi tsunami'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      {compact ? 'Aman' : 'Tidak berpotensi tsunami'}
    </span>
  );
}

export function QuakeListItem({
  q,
  selected,
  userLocation,
  onSelect,
}: {
  q: Quake;
  selected?: boolean;
  userLocation?: { lat: number; lon: number } | null;
  onSelect?: (q: Quake) => void;
}) {
  const m = Number(q.magnitude) || 0;
  const dist =
    userLocation != null ? haversineKm(userLocation.lat, userLocation.lon, q.latitude, q.longitude) : null;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(q)}
        aria-label={`Gempa M ${m.toFixed(1)} di ${q.location}`}
        className={`group block w-full rounded-xl border p-3 text-left transition-all ${
          selected
            ? 'border-red-700 bg-red-50/60 shadow-card'
            : 'border-slate-200 bg-white shadow-card hover:border-slate-300 hover:shadow-pop'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-sm font-extrabold tabular-nums text-white"
            style={{ background: magColor(m) }}
            title={`Magnitudo ${m.toFixed(1)}`}
          >
            {m.toFixed(1)}
            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Magnitudo</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{q.location}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
              <span>{formatWaktu(q.event_time)} WIB</span>
              <span aria-hidden="true">·</span>
              <span>{q.depth_km} km</span>
              {dist != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-teal-700">{formatDistance(dist)} dari Anda</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
          {tsunamiBadge(q.tsunami_status, true)}
          <Link
            href={`/gempa/${q.id}`}
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

export function QuakeTable({ quakes, compact = false }: { quakes: Quake[]; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-200">
              <th scope="col" className="px-4 py-3 font-semibold">Waktu (WIB)</th>
              <th scope="col" className="px-4 py-3 font-semibold">M</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Kedalaman</th>
              <th scope="col" className="px-4 py-3 font-semibold">Wilayah</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Koordinat</th>
              <th scope="col" className="px-4 py-3 font-semibold">Tsunami</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quakes.map((q, i) => (
              <tr
                key={String(q.id)}
                data-testid="quake-row"
                className={`transition-colors hover:bg-red-50/40 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 tabular-nums">
                  {formatWaktu(q.event_time)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex min-w-11 items-center justify-center rounded-md px-1.5 py-1 text-sm font-extrabold tabular-nums text-white"
                    style={{ background: magColor(Number(q.magnitude) || 0) }}
                  >
                    {Number(q.magnitude).toFixed(1)}
                  </span>
                </td>
                {!compact && <td className="hidden whitespace-nowrap px-4 py-2.5 text-slate-600 md:table-cell">{q.depth_km} km</td>}
                {compact && <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{q.depth_km} km</td>}
                <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-slate-800" title={q.location}>
                  {q.location}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-500 lg:table-cell">
                  {q.latitude.toFixed(2)}, {q.longitude.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{tsunamiBadge(q.tsunami_status, true)}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <Link
                    href={`/gempa/${q.id}`}
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
