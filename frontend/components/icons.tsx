'use client';

type IconProps = { className?: string };

function base(props: IconProps, path: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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
