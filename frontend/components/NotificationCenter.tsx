'use client';

import { useEffect, useState } from 'react';
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open ]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi, ${toasts.length} belum dibaca`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-card transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <IconBell className="h-5 w-5" />
        {toasts.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold tabular-nums text-white ring-2 ring-white">
            {toasts.length > 9 ? '9+' : toasts.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup panel notifikasi"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
              <p className="text-sm font-bold text-slate-900">Notifikasi gempa</p>
              {permission !== 'granted' && permission !== 'unsupported' && (
                <button
                  type="button"
                  onClick={onEnable}
                  className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                >
                  Aktifkan
                </button>
              )}
            </div>
            <ul className="thin-scroll max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {toasts.length === 0 && (
                <li className="px-3.5 py-6 text-center text-sm text-slate-500">
                  Belum ada peringatan gempa.
                </li>
              )}
              {toasts.map((t) => (
                <li key={t.id} className="px-3.5 py-2.5 transition-colors hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-snug text-slate-900">{t.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{t.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismiss(t.id)}
                      aria-label="Tutup notifikasi"
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
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
