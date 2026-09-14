import type { TsunamiEvent, TsunamiStatus } from './types.js';

/**
 * Parser CAP 1.2 InaTEWS (https://cdn.bmkg.go.id/last30tsunamievent.xml).
 * Murni + toleran: tidak pernah melempar — XML sampah mengembalikan [].
 *
 * Struktur terverifikasi: satu <alert> berisi 30 peristiwa; tiap peristiwa
 * dibungkus <info>...</info> dengan field <eventid>, <magnitude>, <depth>,
 * <area>, <date>, <time>, <latitude>, <longitude>,
 * <point><coordinates>lon,lat</coordinates></point>, <potential>,
 * <subject> ("Warning Tsunami PD-4"), <headline>, <description>, <sent>.
 */

export function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (!m) return '';
  return decodeEntities(m[1].trim());
}

export function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function num(v: string): number | null {
  // Ambil angka pertama ("10 km" → 10, "8.41 LS" → 8.41).
  const m = v.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse pasangan lintang/bujur dari satu blok <info>.
 * Prioritas: <point><coordinates>lon,lat</coordinates></point>,
 * fallback ke <latitude>/<longitude> dengan penanda LS (negatif) / BB (negatif).
 */
export function parseLatLon(block: string): { latitude: number | null; longitude: number | null } {
  const point = tag(block, 'point');
  if (point) {
    const coordRaw = tag(point, 'coordinates') || stripTags(point);
    const m = coordRaw.replace(',', ' ').match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    // Format CAP: "lon,lat".
    if (m) return { longitude: Number(m[1]), latitude: Number(m[2]) };
  }
  const latRaw = tag(block, 'latitude');
  const lonRaw = tag(block, 'longitude');
  let latitude = num(latRaw);
  let longitude = num(lonRaw);
  if (latitude !== null && /LS/i.test(latRaw)) latitude = -Math.abs(latitude);
  else if (latitude !== null && /LU/i.test(latRaw)) latitude = Math.abs(latitude);
  if (longitude !== null && /BB/i.test(lonRaw)) longitude = -Math.abs(longitude);
  else if (longitude !== null && /BT/i.test(lonRaw)) longitude = Math.abs(longitude);
  return { latitude, longitude };
}

/** Level peringatan dari subject, mis. "Warning Tsunami PD-4" → "4". */
export function parseWarningLevel(subject: string): string | null {
  const m = subject.match(/PD-([\d.]+)/i);
  return m ? m[1] : null;
}

export function parseStatus(subject: string, headline: string, description: string): TsunamiStatus {
  if (/berakhir/i.test(`${headline} ${description} ${subject}`)) return 'ended';
  return 'warning';
}

/**
 * Waktu kejadian → ISO UTC.
 * - Bila <date>/<time> hadir (mis. date "15-08-26", time "04:58:24 WIB"):
 *   parse sebagai WIB (+07:00).
 * - Fallback: eventid YYYYMMDDHHMMSS (waktu WIB) → UTC.
 * - Terakhir: <sent> bila valid, else sekarang.
 */
export function parseEventTime(block: string, eventId: string): string {
  const dateRaw = tag(block, 'date');
  const timeRaw = tag(block, 'time');
  const combined = parseWibDateTime(dateRaw, timeRaw);
  if (combined) return combined;
  const fromId = parseEventIdTime(eventId);
  if (fromId) return fromId;
  const sent = tag(block, 'sent');
  if (sent) {
    const t = new Date(sent);
    if (!Number.isNaN(t.getTime())) return t.toISOString();
  }
  return new Date().toISOString();
}

function parseWibDateTime(dateRaw: string, timeRaw: string): string | null {
  // date: "15-08-26" (DD-MM-YY) atau "2026-08-15"; time: "04:58:24 WIB".
  const d = dateRaw.match(/(\d{1,4})[^\d](\d{1,2})[^\d](\d{1,4})/);
  const t = timeRaw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!d) return null;
  let year: number;
  let month: number;
  let day: number;
  if (d[1].length === 4) {
    year = Number(d[1]);
    month = Number(d[2]);
    day = Number(d[3]);
  } else {
    day = Number(d[1]);
    month = Number(d[2]);
    year = Number(d[3]);
    if (year < 100) year += 2000;
  }
  const hh = t ? Number(t[1]) : 0;
  const mm = t ? Number(t[2]) : 0;
  const ss = t && t[3] ? Number(t[3]) : 0;
  if (![year, month, day, hh, mm, ss].every((n) => Number.isFinite(n))) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hh > 23 || mm > 59 || ss > 59) return null;
  const utcMs = Date.UTC(year, month - 1, day, hh - 7, mm, ss);
  return new Date(utcMs).toISOString();
}

function parseEventIdTime(eventId: string): string | null {
  const m = eventId.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const utcMs = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 7, Number(mi), Number(s));
  const dt = new Date(utcMs);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

function parseOneBlock(block: string): TsunamiEvent | null {
  const eventId = tag(block, 'eventid').replace(/\D/g, '');
  if (!eventId) return null;
  const subject = stripTags(tag(block, 'subject'));
  const headline = stripTags(tag(block, 'headline'));
  const description = stripTags(tag(block, 'description'));
  const magRaw = tag(block, 'magnitude');
  const magnitude = num(magRaw) ?? 0;
  const depthRaw = tag(block, 'depth');
  const { latitude, longitude } = parseLatLon(block);
  return {
    event_id: eventId,
    magnitude,
    depth_km: num(depthRaw),
    area: stripTags(tag(block, 'area')),
    latitude,
    longitude,
    event_time: parseEventTime(block, eventId),
    status: parseStatus(subject, headline, description),
    warning_level: parseWarningLevel(subject),
    potential: stripTags(tag(block, 'potential')),
    headline,
    description,
    source: 'BMKG-InaTEWS',
  };
}

/**
 * Parse feed CAP InaTEWS menjadi daftar peristiwa unik (dedupe event_id,
 * yang pertama = terbaru dipertahankan), urut event_time desc.
 */
export function parseTsunamiFeed(xml: string): TsunamiEvent[] {
  try {
    if (!xml || typeof xml !== 'string') return [];
    let blocks: string[] = xml.match(/<info[\s>][\s\S]*?<\/info>/gi) ?? [];
    if (blocks.length < 2) {
      // Fallback: potong berdasarkan penanda <eventid> bila <info> tidak dipakai.
      const idx: number[] = [];
      const re = /<eventid[^>]*>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) idx.push(m.index);
      if (idx.length === 0) return [];
      blocks = idx.map((start, i) => xml.slice(start, i + 1 < idx.length ? idx[i + 1] : xml.length));
    }
    const seen = new Set<string>();
    const events: TsunamiEvent[] = [];
    for (const block of blocks) {
      const ev = parseOneBlock(block);
      if (!ev || seen.has(ev.event_id)) continue;
      seen.add(ev.event_id);
      events.push(ev);
    }
    events.sort((a, b) => (a.event_time < b.event_time ? 1 : a.event_time > b.event_time ? -1 : 0));
    return events;
  } catch {
    return [];
  }
}
