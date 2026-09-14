'use client';

import { formatWaktu } from '@/lib/geo';
import type { TsunamiEvent } from '@/lib/api';

function formatCoord(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '–';
  return v.toFixed(2);
}

export function TsunamiCard({ event }: { event: TsunamiEvent }) {
  const active = event.status === 'warning';
  const mag = event.magnitude != null && Number.isFinite(event.magnitude) ? event.magnitude.toFixed(1) : '–';
  return (
    <article
      data-testid={active ? 'tsunami-warning-card' : 'tsunami-ended-row'}
      aria-label={active ? `Peringatan tsunami aktif: ${event.area}` : `Riwayat tsunami: ${event.area}`}
      className={`overflow-hidden rounded-xl border shadow-card ${
        active ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={`inline-flex h-11 min-w-14 shrink-0 items-center justify-center rounded-lg px-2 text-lg font-extrabold tabular-nums text-white ${
            active ? 'bg-red-700' : 'bg-slate-700'
          }`}
          aria-label={`Magnitudo ${mag}`}
        >
          {mag}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {event.headline ?? event.area}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {event.area} · {formatWaktu(event.event_time)} WIB
          </p>
        </div>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white">
            <span aria-hidden="true">⚠</span> PERINGATAN AKTIF
            {event.warning_level ? ` · PD-${event.warning_level}` : ''}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Telah berakhir
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-1.5 px-4 pb-3 text-xs sm:grid-cols-4">
        <div className={`rounded-lg px-2 py-1.5 ${active ? 'bg-red-100/60' : 'bg-slate-50'}`}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kedalaman</dt>
          <dd className="font-bold tabular-nums text-slate-900">
            {event.depth_km != null ? `${event.depth_km} km` : '–'}
          </dd>
        </div>
        <div className={`rounded-lg px-2 py-1.5 ${active ? 'bg-red-100/60' : 'bg-slate-50'}`}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Koordinat</dt>
          <dd className="font-bold tabular-nums text-slate-900">
            {formatCoord(event.latitude)}, {formatCoord(event.longitude)}
          </dd>
        </div>
        <div className={`rounded-lg px-2 py-1.5 ${active ? 'bg-red-100/60' : 'bg-slate-50'}`}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Potensi</dt>
          <dd className="font-bold text-slate-900">{event.potential ?? '–'}</dd>
        </div>
        <div className={`rounded-lg px-2 py-1.5 ${active ? 'bg-red-100/60' : 'bg-slate-50'}`}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Waktu</dt>
          <dd className="font-bold tabular-nums text-slate-900">{formatWaktu(event.event_time)} WIB</dd>
        </div>
      </dl>
      {event.description && (
        <p className="px-4 pb-2 text-xs leading-relaxed text-slate-600">{event.description}</p>
      )}
      <div className="border-t border-slate-100 px-4 py-2">
        <a
          href="https://inatews.bmkg.go.id/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-red-700 hover:underline"
        >
          Sumber: InaTEWS BMKG →
        </a>
      </div>
    </article>
  );
}
