import type { CSSProperties } from 'react';

/** Latar lembut dari warna keparahan (untuk lencana & ubin). */
export const tint = (color: string, pct = 14) =>
  `color-mix(in srgb, ${color} ${pct}%, white)`;

/** Warna teks yang tetap terbaca di atas `tint()`. */
export const deep = (color: string, pct = 72) =>
  `color-mix(in srgb, ${color} ${pct}%, black)`;

/** Indeks masuk berurutan; dibatasi agar daftar panjang tidak terasa lambat. */
export const stagger = (i: number): CSSProperties =>
  ({ ['--i' as string]: Math.min(i, 10) }) as CSSProperties;
