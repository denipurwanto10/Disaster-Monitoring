'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconBell, IconX } from './icons';

export interface Toast {
  id: number;
  title: string;
  message: string;
}

export function pushBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    /* abaikan */
  }
}

const EXIT_MS = 170;

export default function NotificationCenter({
  toasts,
  permission,
  onEnable,
  onDismiss,
}: {
  toasts: Toast[];
  permission: string;
  onEnable: () => void;
  onDismiss: (id: number) => void;
}) {
  // `mounted` menahan panel di DOM selama animasi keluar berjalan.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMounted(true);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMounted(false), EXIT_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, hide]);

  const state = open ? 'open' : 'closed';

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? hide() : show())}
        aria-label={`Notifikasi, ${toasts.length} belum dibaca`}
        aria-expanded={open}
        className="dm-btn relative !h-10 !w-10 !p-0"
      >
        <IconBell className="h-[18px] w-[18px]" />
        {toasts.length > 0 && (
          <span
            key={toasts.length}
            className="dm-star-on absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--danger)] px-1 text-[11px] font-bold tabular-nums text-white ring-2 ring-[color:var(--bg)]"
          >
            {toasts.length > 9 ? '9+' : toasts.length}
          </span>
        )}
      </button>
      {mounted && (
        <>
          <button
            type="button"
            aria-label="Tutup panel notifikasi"
            data-state={state}
            className="dm-scrim fixed inset-0 z-40 cursor-default bg-[color:var(--ink)]/20 sm:bg-transparent"
            onClick={hide}
          />
          <div
            data-state={state}
            className="dm-pop dm-float fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[24rem]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line-2)] px-4 py-3">
              <p className="text-sm font-bold text-[color:var(--ink)]">Notifikasi gempa</p>
              {permission !== 'granted' && permission !== 'unsupported' && (
                <button type="button" onClick={onEnable} className="dm-btn dm-btn-solid !h-8 !px-3 !text-xs">
                  Aktifkan
                </button>
              )}
            </div>
            <ul className="thin-scroll max-h-[min(24rem,60vh)] overflow-y-auto">
              {toasts.length === 0 && (
                <li className="px-4 py-9 text-center">
                  <p className="text-sm font-medium text-[color:var(--ink-2)]">Belum ada peringatan gempa.</p>
                  <p className="mt-1 text-xs text-[color:var(--ink-3)]">Gempa baru akan muncul di sini.</p>
                </li>
              )}
              {toasts.map((t, i) => (
                <li
                  key={t.id}
                  className="dm-enter group border-b border-[color:var(--line-2)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[color:var(--surface-2)]"
                  style={{ ['--i' as string]: Math.min(i, 6) }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold leading-snug text-[color:var(--ink)]">{t.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-[color:var(--ink-3)]">{t.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismiss(t.id)}
                      aria-label="Tutup notifikasi"
                      className="-mr-1 -mt-0.5 rounded-md p-1.5 text-[color:var(--ink-4)] transition-colors hover:bg-[color:var(--line-2)] hover:text-[color:var(--ink)]"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
