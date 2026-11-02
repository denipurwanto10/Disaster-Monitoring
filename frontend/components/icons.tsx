'use client';

type IconProps = { className?: string };

function base(props: IconProps, path: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className ?? 'h-5 w-5'}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export function IconPulse(p: IconProps) {
  return base(p, <path d="M3 12h4l3 8 4-16 3 8h4" />);
}

export function IconHistory(p: IconProps) {
  return base(
    p,
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 3" />
    </>,
  );
}

export function IconChart(p: IconProps) {
  return base(
    p,
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </>,
  );
}

export function IconSearch(p: IconProps) {
  return base(p, <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>);
}

export function IconBell(p: IconProps) {
  return base(
    p,
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>,
  );
}

export function IconLocate(p: IconProps) {
  return base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="8" />
    </>,
  );
}

export function IconX(p: IconProps) {
  return base(p, <path d="M18 6 6 18M6 6l12 12" />);
}

export function IconAlert(p: IconProps) {
  return base(
    p,
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 10v4M12 17.5h.01" />
    </>,
  );
}

export function IconInfo(p: IconProps) {
  return base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>,
  );
}

export function IconChevronDown(p: IconProps) {
  return base(p, <path d="m6 9 6 6 6-6" />);
}

export function IconReset(p: IconProps) {
  return base(
    p,
    <>
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );
}

export function IconArrowRight(p: IconProps) {
  return base(p, <path d="M5 12h14m-6-6 6 6-6 6" />);
}

export function IconCalendar(p: IconProps) {
  return base(
    p,
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>,
  );
}

export function IconFilter(p: IconProps) {
  return base(p, <path d="M4 6h16M7 12h10M10 18h4" />);
}

export function IconMountain(p: IconProps) {  return base(
    p,
    <>
      <path d="m3 20 6-12 3.5 6.5L15 10l6 10H3Z" />
      <path d="M14 5.5 16 9l-1.6 1.2" />
    </>,
  );
}

export function IconCloud(p: IconProps) {
  return base(
    p,
    <>
      <path d="M17.5 19a4.5 4.5 0 0 0 .4-9A7 7 0 0 0 4.3 12 3.5 3.5 0 0 0 6 19h11.5Z" />
      <path d="M12 12v6M9.5 15.5 12 13l2.5 2.5" />
    </>,
  );
}

export function IconWave(p: IconProps) {
  return base(
    p,
    <>
      <path d="M2 9c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
      <path d="M2 15c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
    </>,
  );
}

export function IconStar({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={p.className ?? 'h-5 w-5'}
      aria-hidden="true"
    >
      <path d="m12 3.2 2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8L12 3.2Z" />
    </svg>
  );
}

export function IconPin(p: IconProps) {
  return base(
    p,
    <>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>,
  );
}

/** Simbol gunung api ringkas dengan sudut lembut untuk elemen UI kecil. */
export function IconTriangle(p: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinejoin="round"
      className={p.className ?? 'h-4 w-4'}
      aria-hidden="true"
    >
      <path d="M11.1 5.2c.4-.7 1.4-.7 1.8 0l8 13.7c.4.7-.1 1.5-.9 1.5H4c-.8 0-1.3-.8-.9-1.5l8-13.7Z" />
    </svg>
  );
}

/** Miniatur marker gunung api yang konsisten dengan ikon pada peta. */
export function VolcanoMark({ color, className }: IconProps & { color: string }) {
  return (
    <svg viewBox="0 0 40 44" className={className ?? 'h-6 w-6'} aria-hidden="true">
      <path
        d="M20 3.5c1.2 0 2.3.7 2.9 1.8l14.1 24.9c1.3 2.4-.4 5.2-3.1 5.2H6.1c-2.7 0-4.4-2.8-3.1-5.2L17.1 5.3c.6-1.1 1.7-1.8 2.9-1.8Z"
        fill={color}
        stroke="white"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="m12.6 25.3 4.7-8.1 2.8 4 2.2-2.8 5.1 6.9H12.6Z"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.7 28.4h10.6" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}
