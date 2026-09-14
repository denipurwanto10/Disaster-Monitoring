'use client';

export function BarChart({
  items,
  barColor = '#b91c1c',
}: {
  items: { label: string; value: number }[];
  barColor?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div
      className="space-y-2.5"
      role="img"
      aria-label={`Diagram batang: ${items.map((i) => `${i.label} ${i.value}`).join(', ')}`}
    >
      {items.map((i) => (
        <div key={i.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
          <span className="truncate text-slate-600" title={i.label}>
            {i.label}
          </span>
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="presentation"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(i.value > 0 ? 4 : 0, (i.value / max) * 100)}%`, background: barColor }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-bold tabular-nums text-slate-800">{i.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniTimeline({ items }: { items: { date: string; count: number; maxMag: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const W = 560;
  const H = 96;
  const n = Math.max(items.length, 1);
  const step = W / n;
  const bw = Math.min(26, step * 0.55);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-28 w-full"
      role="img"
      aria-label={`Linimasa gempa ${items.length} hari terakhir`}
      preserveAspectRatio="xMidYMid meet"
    >
      {[0.33, 0.66, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={W}
          y1={H - 20 - (H - 28) * f}
          y2={H - 20 - (H - 28) * f}
          stroke="#e2e8f0"
          strokeDasharray="3 4"
          strokeWidth={1}
        />
      ))}
      {items.map((t, i) => {
        const h = Math.max(4, (t.count / max) * (H - 30));
        const x = i * step + (step - bw) / 2;
        const hot = t.maxMag >= 6;
        const warm = !hot && t.maxMag >= 5;
        return (
          <g key={t.date}>
            <title>{`${t.date}: ${t.count} gempa, maks M ${t.maxMag}`}</title>
            <rect
              x={x}
              y={H - 20 - h}
              width={bw}
              height={h}
              rx={bw / 2}
              fill={hot ? '#b91c1c' : warm ? '#ea580c' : '#0f172a'}
              opacity={hot || warm ? 0.92 : 0.78}
            />
            {t.count > 0 && (
              <text
                x={x + bw / 2}
                y={H - 24 - h}
                fontSize={9}
                fontWeight={700}
                textAnchor="middle"
                fill="#475569"
              >
                {t.count}
              </text>
            )}
          </g>
        );
      })}
      {items.filter((_, i) => i % Math.ceil(n / 7) === 0).map((t) => {
        const i = items.indexOf(t);
        return (
          <text key={t.date} x={i * step + step / 2} y={H - 5} fontSize={9} textAnchor="middle" fill="#64748b">
            {t.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}
