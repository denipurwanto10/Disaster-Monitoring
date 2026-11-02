'use client';

import { useCallback, useState } from 'react';
import { addWatch, isWatched, removeWatch, type WatchKind } from '@/lib/watchlist';
import { IconStar } from './icons';

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
      className={`dm-btn ${
        watched ? '!border-[#e3c98f] !bg-[#fbf3de] !text-[#7a5410] hover:!bg-[#f8ecca]' : ''
      }`}
    >
      {/* key memicu animasi pop setiap status berubah */}
      <span
        key={String(watched)}
        className={`inline-flex ${watched ? 'dm-star-on text-[#c98a14]' : 'text-[color:var(--ink-4)]'}`}
        aria-hidden="true"
      >
        <IconStar filled={watched} className="h-4 w-4" />
      </span>
      {watched ? 'Dipantau' : 'Pantau'}
    </button>
  );
}
