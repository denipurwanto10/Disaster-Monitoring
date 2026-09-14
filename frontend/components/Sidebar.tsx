'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StatusBar from './StatusBar';
import { IconBell, IconChart, IconCloud, IconHistory, IconMountain, IconPulse, IconWave } from './icons';
import type { Health } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Pantauan', icon: IconPulse },
  { href: '/gunung-api', label: 'Gunung Api', icon: IconMountain },
  { href: '/cuaca', label: 'Cuaca', icon: IconCloud },
  { href: '/tsunami', label: 'Tsunami', icon: IconWave },
  { href: '/pantauan', label: 'Pantauan', icon: IconBell },
  { href: '/riwayat', label: 'Riwayat', icon: IconHistory },
  { href: '/statistik', label: 'Statistik', icon: IconChart },
];

export function Sidebar({
  health,
  fetchError,
  socketConnected,
}: {
  health: Health | null;
  fetchError: boolean;
  socketConnected: boolean;
}) {
  const path = usePathname();
  return (
    <aside
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-slate-900 text-slate-200 md:flex"
      aria-label="Navigasi utama"
    >
      <div className="border-b border-white/10 px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-white">
            <IconPulse className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-white">Disaster Monitoring</p>
            <p className="text-[11px] leading-tight text-slate-400">Indonesia &middot; BMKG</p>
          </div>
        </div>
        <div className="mt-3">
          <StatusBar dark health={health} fetchError={fetchError} socketConnected={socketConnected} />
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((n) => {
          const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-red-700 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-slate-400">
        <p className="font-semibold text-slate-300">Sumber data: BMKG</p>
        <p>Pembaruan otomatis via WebSocket.</p>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      aria-label="Navigasi bawah"
    >
      <div className="grid grid-cols-7">
        {NAV.map((n) => {
          const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? 'text-red-700' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              {n.label}
              <span
                className={`h-1 w-8 rounded-full ${active ? 'bg-red-700' : 'bg-transparent'}`}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
