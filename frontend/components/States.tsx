'use client';

import { IconAlert, IconInfo } from './icons';
import { stagger } from './ui';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="dm-fade flex flex-col items-center rounded-[var(--r-md)] border border-dashed border-[color:var(--ink-4)]/60 px-6 py-12 text-center"
      role="status"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[color:var(--ink-3)] ring-1 ring-inset ring-[color:var(--line)]">
        <IconInfo className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[color:var(--ink)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-[color:var(--ink-3)]">{message}</p>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="dm-fade relative flex flex-col items-start gap-1 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] py-5 pl-6 pr-5 sm:flex-row sm:items-center sm:gap-4"
      role="alert"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-[color:var(--danger)]" aria-hidden="true" />
      <IconAlert className="h-5 w-5 shrink-0 text-[color:var(--danger)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[color:var(--ink)]">{title}</p>
        <p className="mt-0.5 max-w-prose text-sm leading-relaxed text-[color:var(--ink-2)]">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="dm-btn dm-btn-solid mt-3 sm:mt-0">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function LoadingRow({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div
      className="dm-card dm-fade flex items-center gap-3 p-4 text-sm text-[color:var(--ink-3)]"
      role="status"
      aria-live="polite"
    >
      <span className="dm-spinner shrink-0" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Skeleton baris daftar — dipakai saat first load agar layout tidak melompat. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="dm-card dm-enter p-3.5" style={stagger(i)}>
          <div className="flex items-center gap-3.5">
            <div className="skeleton h-[52px] w-[52px] shrink-0 !rounded-[11px]" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t border-[color:var(--line-2)] pt-3">
            <div className="skeleton h-3 w-14" />
            <div className="skeleton h-3 w-12" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Skeleton kartu statistik. */
export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dm-card dm-enter p-4" style={stagger(i)}>
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-3 h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
