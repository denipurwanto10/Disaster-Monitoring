'use client';

import { useEffect, useRef, useState } from 'react';

export function BarChart({
  items,
  barColor = 'var(--ink-2)',
}: {
  items: { label: string; value: number }[];
  barColor?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  // Mulai dari 0 lalu tumbuh ke nilai sebenarnya setelah mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="space-y-3"
      role="img"
      aria-label={`Diagram batang: ${items.map((i) => `${i.label} ${i.value}`).join(', ')}`}
    >
      {items.map((i, idx) => (
        <div
          key={i.label}
          className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_auto]"
        >
          <span className="truncate text-[color:var(--ink-2)]" title={i.label}>
            {i.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--line-2)]" role="presentation">
            <div
              className="dm-bar h-full rounded-full"
              style={{
                width: ready ? `${Math.max(i.value > 0 ? 3 : 0, (i.value / max) * 100)}%` : '0%',
                background: barColor,
                transitionDelay: `${Math.min(idx, 12) * 45}ms`,
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-bold tabular-nums text-[color:var(--ink)]">{i.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniTimeline({ items }: { items: { date: string; count: number; maxMag: number }[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  // Ukur lebar asli agar teks sumbu tetap terbaca di layar kecil (tanpa skala SVG).
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 132;
  const top = 22;
  const base = H - 24;
  const max = Math.max(1, ...items.map((i) => i.count));
  const n = Math.max(items.length, 1);
  const step = W / n;
  const bw = Math.max(4, Math.min(28, step * 0.58));
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(W / 64))));
  const hovered = hover != null ? items[hover] : null;

  return (
    <div ref={wrap} className="relative">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Linimasa gempa ${items.length} hari terakhir`}
        onMouseLeave={() => setHover(null)}
      >
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={base - (base - top) * f}
            y2={base - (base - top) * f}
            style={{ stroke: 'var(--line)' }}
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
        ))}
        <line x1={0} x2={W} y1={base} y2={base} style={{ stroke: 'var(--line)' }} />
        {items.map((t, i) => {
          const h = t.count === 0 ? 0 : Math.max(4, (t.count / max) * (base - top));
          const x = i * step + (step - bw) / 2;
          const hot = t.maxMag >= 6;
          const warm = !hot && t.maxMag >= 5;
          const fill = hot ? 'var(--danger)' : warm ? '#c2701f' : 'var(--ink-2)';
          const dim = hover != null && hover !== i;
          return (
            <g key={t.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}>
              <title>{`${t.date}: ${t.count} gempa, maks M ${t.maxMag}`}</title>
              {/* area sentuh lebar */}
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
              <rect
                className="dm-col"
                style={{ ['--i' as string]: Math.min(i, 30), fill, opacity: dim ? 0.3 : hot || warm ? 1 : 0.82 }}
                x={x}
                y={base - h}
                width={bw}
                height={h}
                rx={Math.min(4, bw / 2)}
              />
              {t.count > 0 && n <= 20 && !dim && (
                <text
                  x={x + bw / 2}
                  y={base - h - 6}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                  style={{ fill: 'var(--ink-2)' }}
                >
                  {t.count}
                </text>
              )}
            </g>
          );
        })}
        {items.map((t, i) =>
          i % every === 0 ? (
            <text
              key={t.date}
              x={i * step + step / 2}
              y={H - 6}
              fontSize={11}
              textAnchor="middle"
              style={{ fill: 'var(--ink-3)' }}
            >
              {t.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
      {hovered && hover != null && (
        <div
          className="dm-float pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs tabular-nums text-[color:var(--ink-2)]"
          style={{ left: Math.min(Math.max(hover * step + step / 2, 70), W - 70) }}
        >
          <span className="font-semibold text-[color:var(--ink)]">{hovered.date.slice(5)}</span>
          {' '}
          {hovered.count} gempa, M maks {hovered.maxMag}
        </div>
      )}
    </div>
  );
}
