export interface ListQuery {
  limit: number;
  page: number;
  minMag: number | null;
  maxMag: number | null;
  q: string | null;
  from: string | null;
  to: string | null;
  sort: 'asc' | 'desc';
}

export class ValidationError extends Error {
  status = 400;
  code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Kegagalan sumber data hulu (BMKG/MAGMA): 502 agar dibedakan dari salah input. */
export class UpstreamError extends Error {
  status = 502;
  code = 'UPSTREAM_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}

function parseMag(value: unknown, name: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10) {
    throw new ValidationError(`Parameter ${name} harus berupa angka 0 sampai 10.`);
  }
  return n;
}

function parseDate(value: unknown, name: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError(`Parameter ${name} harus tanggal ISO yang valid.`);
  const t = value.trim();
  // Terima "YYYY-MM-DD" atau ISO penuh; normalkan ke DATETIME untuk perbandingan string.
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`Parameter ${name} harus tanggal ISO yang valid.`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return name === 'to' ? `${t} 23:59:59` : `${t} 00:00:00`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Validasi query untuk GET /api/earthquakes & /history. Melempar ValidationError bila tidak valid. */
export function validateListQuery(query: Record<string, unknown>): ListQuery {
  let limit = 20;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new ValidationError('Parameter limit harus berupa bilangan bulat 1 sampai 100.');
    }
    limit = n;
  }
  let page = 1;
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const n = Number(query.page);
    if (!Number.isInteger(n) || n < 1) {
      throw new ValidationError('Parameter page harus berupa bilangan bulat minimal 1.');
    }
    page = n;
  }
  const minMag = parseMag(query.minMag, 'minMag');
  const maxMag = parseMag(query.maxMag, 'maxMag');
  if (minMag !== null && maxMag !== null && minMag > maxMag) {
    throw new ValidationError('Parameter minMag tidak boleh lebih besar dari maxMag.');
  }
  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to');
  const q = typeof query.q === 'string' && query.q.trim() ? query.q.trim() : null;
  const sortRaw = typeof query.sort === 'string' ? query.sort.toLowerCase() : 'desc';
  if (sortRaw !== 'asc' && sortRaw !== 'desc') {
    throw new ValidationError('Parameter sort harus "asc" atau "desc".');
  }
  return { limit, page, minMag, maxMag, q, from, to, sort: sortRaw };
}
