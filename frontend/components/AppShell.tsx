'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LeafletFix from './LeafletFix';
import { BottomNav, Sidebar } from './Sidebar';
import { IconPulse } from './icons';
import type { Health } from '@/lib/api';

export function AppShell({
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
  const path = usePathname();
  return (
    <div className="flex min-h-dvh w-full overflow-x-clip">
      <LeafletFix />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-safe-content">
        <header
          className="dm-topbar sticky top-3 z-[1000] mx-3 mt-3 shrink-0 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface)] transition-colors duration-200 sm:mx-4 sm:mt-4"
        >
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5 md:px-6 md:py-3">
            <div className="mr-auto min-w-0">
              <div className="flex items-center gap-3 md:hidden">
                <Link
                  href="/"
                  aria-label="Beranda"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--basalt)] text-white"
                >
                  <IconPulse className="h-[18px] w-[18px]" />
                </Link>
                <h1 className="truncate text-[17px] font-bold tracking-[-0.02em] text-[color:var(--ink)]">
                  {title}
                </h1>
              </div>
              <h1 className="hidden text-[26px] font-bold leading-tight tracking-[-0.03em] text-[color:var(--ink)] md:block">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 hidden max-w-[62ch] text-[13px] leading-snug text-[color:var(--ink-3)] sm:block">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
                {actions}
              </div>
            )}
          </div>
        </header>

        <main
          key={path}
          className="dm-page mx-auto min-w-0 w-full max-w-[1440px] flex-1 space-y-4 px-4 pb-6 pt-3 sm:px-5 md:space-y-5 md:px-7 md:pb-10"
        >
          {children}
        </main>

        <footer className="min-w-0 px-4 pb-6 text-xs leading-relaxed text-[color:var(--ink-3)] sm:px-5 md:px-7">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-1 border-t border-[color:var(--line)] pt-4">
            <span>
              Sumber data{' '}
              <strong className="font-semibold text-[color:var(--ink-2)]">BMKG</strong>, Badan
              Meteorologi, Klimatologi, dan Geofisika
            </span>
            <span>Waktu dalam WIB (Asia/Jakarta)</span>
            <span className="ml-auto hidden gap-5 md:flex">
              <Link href="/riwayat" className="transition-colors hover:text-[color:var(--ink)]">
                Riwayat
              </Link>
              <Link href="/statistik" className="transition-colors hover:text-[color:var(--ink)]">
                Statistik
              </Link>
            </span>
          </div>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
