'use client';

import { useCallback, useState } from 'react';
import { addWatch, isWatched, removeWatch, type WatchKind } from '@/lib/watchlist';

export default function WatchButton({
  kind,
  id,
  label,
  sub,
  href,
}: {
  kind: WatchKind;
  id: string;
  label: string;
  sub?: string;
  href: string;
}) {
  const [watched, setWatched] = useState<boolean>(() => {
    try {
      return isWatched(kind, id);
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    try {
      if (isWatched(kind, id)) {
        removeWatch(kind, id);
        setWatched(false);
      } else {
        addWatch({ kind, id, label, sub, href });
        setWatched(true);
      }
    } catch {
      /* localStorage tidak tersedia — abaikan */
    }
  }, [kind, id, label, sub, href]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watched}
      aria-label={watched ? `Berhenti memantau ${label}` : `Pantau ${label}`}
      title={watched ? 'Berhenti memantau' : 'Pantau lokasi ini'}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-card transition-colors ${
        watched
          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span aria-hidden="true" className={watched ? 'text-amber-500' : 'text-slate-400'}>
        {watched ? '★' : '☆'}
      </span>
      {watched ? 'Dipantau' : 'Pantau'}
    </button>
  );
}
