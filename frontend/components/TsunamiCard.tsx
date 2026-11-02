'use client';

import { formatWaktu } from '@/lib/geo';
import type { TsunamiEvent } from '@/lib/api';
import { IconAlert, IconArrowRight } from './icons';

function formatCoord(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '–';
  return v.toFixed(2);
}

export function TsunamiCard({ event }: { event: TsunamiEvent }) {
  const active = event.status === 'warning';
  const mag = event.magnitude != null && Number.isFinite(event.magnitude) ? event.magnitude.toFixed(1) : '–';
  const facts = [
    { k: 'Kedalaman', v: event.depth_km != null ? `${event.depth_km} km` : '–' },
    { k: 'Koordinat', v: `${formatCoord(event.latitude)}, ${formatCoord(event.longitude)}` },
    { k: 'Potensi', v: event.potential ?? '–' },
    { k: 'Waktu', v: `${formatWaktu(event.event_time)} WIB` },
  ];
  return (
    <article
      data-testid={active ? 'tsunami-warning-card' : 'tsunami-ended-row'}
      aria-label={active ? `Peringatan tsunami aktif: ${event.area}` : `Riwayat tsunami: ${event.area}`}
      className={`dm-fade relative overflow-hidden rounded-[var(--r-md)] border ${
        active
          ? 'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]'
          : 'border-[color:var(--line)] bg-[color:var(--surface)]'
      }`}
    >
      {active && <span className="absolute inset-y-0 left-0 w-1 bg-[color:var(--danger)]" aria-hidden="true" />}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 pb-3 pt-4 sm:flex-nowrap">
        <span
          className={`inline-flex h-12 min-w-[3.25rem] shrink-0 items-center justify-center rounded-[11px] px-2 text-[22px] font-bold tabular-nums tracking-[-0.03em] ${
            active ? 'bg-[color:var(--danger)] text-white' : 'bg-[color:var(--surface-2)] text-[color:var(--ink-2)]'
          }`}
          aria-label={`Magnitudo ${mag}`}
        >
          {mag}
        </span>
        <div className="min-w-0 flex-1 basis-[12rem]">
          <p className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-[color:var(--ink)]">
            {event.headline ?? event.area}
          </p>
          <p className="mt-0.5 text-[13px] text-[color:var(--ink-3)]">
            {event.area}, {formatWaktu(event.event_time)} WIB
          </p>
        </div>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--danger)] py-1.5 pl-2.5 pr-3 text-xs font-bold text-white">
            <IconAlert className="dm-breathe h-3.5 w-3.5" />
            Peringatan aktif{event.warning_level ? ` PD-${event.warning_level}` : ''}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-3)]">
            Telah berakhir
          </span>
        )}
      </div>

      <dl
        className={`mx-5 grid grid-cols-2 gap-y-3 border-t py-3.5 text-sm sm:grid-cols-4 ${
          active ? 'border-[color:var(--danger-line)]' : 'border-[color:var(--line-2)]'
        }`}
      >
        {facts.map((f) => (
          <div key={f.k} className="min-w-0 pr-3">
            <dt className="text-xs text-[color:var(--ink-3)]">{f.k}</dt>
            <dd className="mt-0.5 truncate font-semibold tabular-nums text-[color:var(--ink)]">{f.v}</dd>
          </div>
        ))}
      </dl>

      {event.description && (
        <p className="mx-5 max-w-[72ch] pb-3 text-sm leading-relaxed text-[color:var(--ink-2)]">
          {event.description}
        </p>
      )}
      <div className="px-5 pb-4">
        <a
          href="https://inatews.bmkg.go.id/"
          target="_blank"
          rel="noopener noreferrer"
          className="dm-link group"
        >
          Sumber: InaTEWS BMKG
          <IconArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}
