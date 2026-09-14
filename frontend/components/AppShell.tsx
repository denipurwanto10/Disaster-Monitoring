'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import LeafletFix from './LeafletFix';
import { BottomNav, Sidebar } from './Sidebar';
import type { Health } from '@/lib/api';

export function AppShell({
  health,
  fetchError,
  socketConnected,
  title,
  subtitle,
  actions,
  children,
}: {
  health: Health | null;
  fetchError: boolean;
  socketConnected: boolean;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <LeafletFix />
      <Sidebar health={health} fetchError={fetchError} socketConnected={socketConnected} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:px-4 md:px-6">
            <div className="mr-auto min-w-0">
              <div className="flex items-center gap-2.5 md:hidden">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-700 text-[11px] font-extrabold text-white">
                  DM
                </span>
                <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
                  {title}
                </h1>
              </div>
              <h1 className="hidden text-lg font-bold tracking-tight text-slate-900 md:block">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{subtitle}</p>
              )}
            </div>
            {actions}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500 md:px-6">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Sumber data: <strong className="font-semibold text-slate-700">BMKG</strong> (Badan
              Meteorologi, Klimatologi, dan Geofisika)
            </span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>Waktu dalam WIB (Asia/Jakarta)</span>
            <span className="ml-auto hidden md:inline">
              <Link href="/riwayat" className="hover:text-slate-800 hover:underline">Riwayat</Link>
              {' · '}
              <Link href="/statistik" className="hover:text-slate-800 hover:underline">Statistik</Link>
            </span>
          </div>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
