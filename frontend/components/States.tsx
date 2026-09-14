'use client';

import { IconAlert, IconInfo } from './icons';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"
      role="status"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <IconInfo className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
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
      className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center"
      role="alert"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
        <IconAlert className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-red-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-red-800/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 active:bg-red-900"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function LoadingRow({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-red-700"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

/** Skeleton baris daftar — dipakai saat first load agar layout tidak melompat. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-14 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3.5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Skeleton kartu statistik. */
export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-2 h-7 w-20" />
        </div>
      ))}
    </div>
  );
}
