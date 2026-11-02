'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import {
  IconBell,
  IconChart,
  IconCloud,
  IconHistory,
  IconMountain,
  IconPulse,
  IconWave,
} from './icons';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Pantauan', icon: IconPulse },
  { href: '/gunung-api', label: 'Gunung Api', icon: IconMountain },
  { href: '/cuaca', label: 'Cuaca', icon: IconCloud },
  { href: '/tsunami', label: 'Tsunami', icon: IconWave },
  { href: '/pantauan', label: 'Pantauan Saya', icon: IconBell },
  { href: '/riwayat', label: 'Riwayat', icon: IconHistory },
  { href: '/statistik', label: 'Statistik', icon: IconChart },
];

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'PEMANTAUAN', items: NAV.slice(0, 4) },
  { label: 'PERSONAL', items: NAV.slice(4, 5) },
  { label: 'DATA & ANALISIS', items: NAV.slice(5) },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
}

export function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('dm-sidebar') === 'rail');
    } catch {
      // Preferensi sidebar bersifat opsional.
    }
  }, []);

  const toggle = () =>
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('dm-sidebar', next ? 'rail' : 'full');
      } catch {
        // Abaikan jika storage tidak tersedia.
      }
      return next;
    });

  const labelClass = `overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 [transition-timing-function:var(--ease)] ${
    collapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100'
  }`;

  return (
    <aside
      data-collapsed={collapsed}
      className={`sticky top-0 z-40 hidden h-dvh shrink-0 p-3 transition-[width] duration-300 [transition-timing-function:var(--ease)] xl:block ${
        collapsed ? 'w-[5.5rem]' : 'w-[17.5rem]'
      }`}
      aria-label="Navigasi utama"
    >
      <div
        className="flex h-full flex-col overflow-hidden rounded-[22px] text-[#dfe7e3]"
        style={{ backgroundColor: 'var(--basalt, #15211e)' }}
      >
        <Link
          href="/"
          aria-label="Disaster Monitoring, beranda"
          className={`mx-3 mt-4 flex h-12 shrink-0 items-center rounded-[14px] ${collapsed ? 'justify-center' : 'gap-3 px-1.5'}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[color:var(--ember)]">
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
              <path
                d="M2 12h4l2.2 6 3.6-14 3 8H22"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={labelClass}>
            <span className="block text-[15px] font-bold leading-tight tracking-[-0.01em] text-white">
              Disaster Monitoring
            </span>
            <span className="block text-xs leading-tight text-[color:var(--basalt-ink-2)]">BMKG Indonesia</span>
          </span>
        </Link>

        <nav className="thin-scroll mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Halaman">
          {NAV_GROUPS.map((group, groupIndex) => (
            <section
              key={group.label}
              aria-label={group.label}
              className={groupIndex > 0 ? 'mt-5 border-t border-white/[0.08] pt-4' : ''}
            >
              {!collapsed && (
                <h2 className="mb-2 px-2.5 text-[10px] font-bold tracking-[0.14em] text-[#72827b]">
                  {group.label}
                </h2>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(path, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex h-11 items-center rounded-[12px] text-sm font-semibold transition-[background-color,color,transform] duration-200 ${
                        collapsed ? 'justify-center px-2' : 'gap-3 px-2.5'
                      } ${
                        active
                          ? 'bg-white/[0.10] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]'
                          : 'text-[#94a39d] hover:bg-white/[0.055] hover:text-white'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[color:var(--ember)]"
                        />
                      )}
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className={labelClass}>{item.label}</span>
                      {collapsed && (
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-[#26352f] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className={`group flex h-11 w-full items-center rounded-[12px] text-sm font-medium text-[#94a39d] transition-colors hover:bg-white/[0.06] hover:text-white ${
              collapsed ? 'justify-center px-2' : 'gap-3 px-2.5'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 shrink-0 transition-transform duration-300 [transition-timing-function:var(--ease)] ${
                collapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m13 6-6 6 6 6M19 6l-6 6 6 6" />
            </svg>
            <span className={labelClass}>Ciutkan</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

const MOBILE_PRIMARY = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

export function BottomNav() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((item) => isActive(path, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe-nav xl:hidden" aria-label="Navigasi bawah">
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Tutup menu lainnya"
            className="fixed inset-0 z-40 cursor-default bg-black/10"
            onClick={() => setMoreOpen(false)}
          />
          <div className="dm-float absolute bottom-full right-3 z-50 mb-2 w-60 rounded-2xl p-2">
            {NAV_GROUPS.slice(1).map((group, groupIndex) => (
              <section key={group.label} className={groupIndex > 0 ? 'mt-2 border-t border-[color:var(--line-2)] pt-2' : ''}>
                <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold tracking-[0.14em] text-[color:var(--ink-3)]">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = isActive(path, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[color:var(--surface-2)] text-[color:var(--ink)]'
                          : 'text-[color:var(--ink-2)] hover:bg-[color:var(--surface-2)]'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </section>
            ))}
          </div>
        </>
      )}
      <div className="dm-float relative z-50 mx-auto flex max-w-md gap-1 rounded-[18px] p-1.5">
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(path, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`flex h-11 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-[13px] px-1 transition-[flex-grow,background-color,color] duration-300 [transition-timing-function:var(--ease)] ${
                active
                  ? 'flex-[2.4_1_0%] bg-[color:var(--basalt)] text-white'
                  : 'flex-[1_1_0%] text-[color:var(--ink-3)] hover:bg-[color:var(--surface-2)]'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span
                className={`truncate text-[11px] font-semibold transition-[max-width,opacity] duration-300 ${
                  active ? 'max-w-[5.25rem] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-label="Lainnya"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className={`flex h-11 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-[13px] px-1 text-[11px] font-semibold transition-[flex-grow,background-color,color] duration-300 [transition-timing-function:var(--ease)] ${
            moreActive || moreOpen
              ? 'flex-[2.4_1_0%] bg-[color:var(--basalt)] text-white'
              : 'flex-[1_1_0%] text-[color:var(--ink-3)] hover:bg-[color:var(--surface-2)]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
          <span
            className={`truncate transition-[max-width,opacity] duration-300 ${
              moreActive || moreOpen ? 'max-w-[5.25rem] opacity-100' : 'max-w-0 opacity-0'
            }`}
          >
            Lainnya
          </span>
        </button>
      </div>
    </nav>
  );
}
