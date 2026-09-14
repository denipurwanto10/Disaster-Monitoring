'use client';

export type WatchKind = 'volcano' | 'weather' | 'quake';

export interface WatchItem {
  id: string;
  kind: WatchKind;
  label: string;
  sub?: string;
  href: string;
  created_at: string;
}

const KEY = 'dmi:watchlist:v1';

function ssrList(): WatchItem[] {
  return [];
}

export function getWatchlist(): WatchItem[] {
  if (typeof window === 'undefined') return ssrList();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Record<string, unknown>[])
      .filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && typeof p.kind === 'string')
      .map((p) => ({
        id: String(p.id),
        kind: (['volcano', 'weather', 'quake'] as string[]).includes(String(p.kind))
          ? (p.kind as WatchKind)
          : 'quake',
        label: String(p.label ?? p.id),
        sub: p.sub != null ? String(p.sub) : undefined,
        href: String(p.href ?? '#'),
        created_at: String(p.created_at ?? new Date().toISOString()),
      }));
  } catch {
    return [];
  }
}

function save(list: WatchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* penyimpanan penuh / privat — abaikan */
  }
}

export function addWatch(item: Omit<WatchItem, 'created_at'> & { created_at?: string }): WatchItem[] {
  const list = getWatchlist();
  if (list.some((w) => w.kind === item.kind && w.id === item.id)) return list;
  const next = [
    ...list,
    { ...item, created_at: item.created_at ?? new Date().toISOString() },
  ];
  save(next);
  return next;
}

export function removeWatch(kind: WatchKind, id: string): WatchItem[] {
  const next = getWatchlist().filter((w) => !(w.kind === kind && w.id === id));
  save(next);
  return next;
}

export function isWatched(kind: WatchKind, id: string): boolean {
  return getWatchlist().some((w) => w.kind === kind && w.id === id);
}

export function countWatchlist(): number {
  return getWatchlist().length;
}
