import axios from 'axios';
import { LEVEL_BY_NAME, NAME_BY_LEVEL, type VolcanoLevel, type VolcanoLevelName } from './types.js';

export const DEFAULT_ACTIVITY_URL = 'https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas';
const FETCH_TIMEOUT_MS = 15000;

/** URL halaman tingkat aktivitas (bisa dioverride via env MAGMA_ACTIVITY_URL). */
export function magmaActivityUrl(): string {
  const v = process.env.MAGMA_ACTIVITY_URL?.trim();
  return v ? v : DEFAULT_ACTIVITY_URL;
}

export interface ScrapedVolcano {
  level: VolcanoLevel;
  level_name: VolcanoLevelName;
  name: string;
  province: string;
  report_url: string | null;
  report_id: string | null;
}

/** Ambil HTML halaman tingkat aktivitas MAGMA. Melempar bila gagal (penangkap di sync.ts). */
export async function fetchActivityPage(url?: string): Promise<string> {
  const target = url ?? magmaActivityUrl();
  const res = await axios.get(target, {
    timeout: FETCH_TIMEOUT_MS,
    responseType: 'text',
    maxRedirects: 5,
    headers: { 'User-Agent': 'disaster-monitoring/1.0 (+BMKG-MAGMA-mirror)' },
  });
  return typeof res.data === 'string' ? res.data : String(res.data);
}

const ROW_RE = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const LEVEL_RE = /Level\s+(IV|III|II|I)\s*\(\s*(Awas|Siaga|Waspada|Normal)\s*\)/i;
const LINK_RE = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
const TAG_RE = /<[^>]+>/g;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

/** Buang tag HTML → teks polos satu baris. */
function plainText(html: string): string {
  return decodeEntities(html.replace(TAG_RE, ' ')).replace(/\s+/g, ' ').trim();
}

/** Bersihkan fragmen nama dari sisa header baris ("Level III (Siaga) 5 ..."). */
function cleanName(raw: string): string {
  return raw
    .replace(LEVEL_RE, ' ')
    .replace(/^\D*?\d+\s+/, (m) => (/\d/.test(m) && m.replace(/\d/g, '').trim() === '' ? '' : m))
    .replace(/^\d+\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanProvince(raw: string): string {
  return raw
    .replace(/[\[\(].*$/, '')
    .replace(/[,;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 128);
}

function absolutize(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  const base = 'https://magma.esdm.go.id';
  return href.startsWith('/') ? base + href : base + '/' + href;
}

function extractReportId(href: string): string | null {
  const m1 = href.match(/laporan\/(\d+)/i);
  if (m1) return m1[1];
  const m2 = href.match(/(\d{3,})/);
  return m2 ? m2[1] : null;
}

/**
 * Parse HTML halaman tingkat aktivitas MAGMA menjadi daftar gunung.
 * Murni (tanpa I/O) agar mudah diuji. Baris tanpa nama level yang dikenal
 * (Awas/Siaga/Waspada/Normal) diabaikan — toleran terhadap perubahan jumlah.
 *
 * CATATAN MARKUP: tabel memakai rowspan — sel header level ("Level III
 * (Siaga)") berada di <tr> tersendiri, sedangkan setiap gunung ("Anak
 * Krakatau - Lampung [Lihat laporan]") berada di <tr> berikutnya TANPA
 * pengulangan nama level. Karena itu parser melacak level terakhir yang
 * terlihat (state `current`) dan menerapkannya ke baris-baris gunung
 * berikutnya, bukan mencari level di tiap baris.
 */
export function parseActivityHtml(html: string): ScrapedVolcano[] {
  const out: ScrapedVolcano[] = [];
  if (!html) return out;

  let current: { level: VolcanoLevel; level_name: VolcanoLevelName } | null = null;
  let rowMatch: RegExpExecArray | null;
  ROW_RE.lastIndex = 0;
  while ((rowMatch = ROW_RE.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const levelMatch = rowHtml.match(LEVEL_RE);
    if (levelMatch) {
      const levelName = capitalizeLevel(levelMatch[2]);
      const level = levelName ? LEVEL_BY_NAME[levelName.toLowerCase()] : undefined;
      const level_name = level ? NAME_BY_LEVEL[level] : undefined;
      current = level && level_name ? { level, level_name } : null;
      // Baris header level tidak memuat gunung — lanjut (link di baris ini, bila ada, bukan "Lihat laporan").
    }
    if (!current) continue;

    // Kumpulkan semua link "Lihat laporan" di baris ini; nama + provinsi
    // dibaca dari teks tepat sebelum link tersebut.
    LINK_RE.lastIndex = 0;
    let linkMatch: RegExpExecArray | null;
    let cursor = 0;
    while ((linkMatch = LINK_RE.exec(rowHtml)) !== null) {
      const inner = plainText(linkMatch[2]);
      if (!/lihat laporan/i.test(inner)) {
        cursor = LINK_RE.lastIndex;
        continue;
      }
      const href = linkMatch[1].trim();
      const beforeHtml = rowHtml.slice(cursor, linkMatch.index);
      cursor = LINK_RE.lastIndex;
      const before = plainText(beforeHtml);
      const sep = before.lastIndexOf(' - ');
      if (sep < 0) continue;
      const name = cleanName(before.slice(0, sep));
      const province = cleanProvince(before.slice(sep + 3));
      if (!name || !province) continue;
      out.push({
        level: current.level,
        level_name: current.level_name,
        name,
        province,
        report_url: href ? absolutize(href) : null,
        report_id: href ? extractReportId(href) : null,
      });
    }
  }
  return out;
}

function capitalizeLevel(s: string): VolcanoLevelName | null {
  const t = s.trim().toLowerCase();
  if (t === 'awas') return 'Awas';
  if (t === 'siaga') return 'Siaga';
  if (t === 'waspada') return 'Waspada';
  if (t === 'normal') return 'Normal';
  return null;
}
