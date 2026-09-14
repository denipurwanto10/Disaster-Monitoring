export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '-';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Math.round(km).toLocaleString('id-ID')} km`;
}

export function formatWaktu(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

export function formatTanggal(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return 'belum ada data';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'belum ada data';
  const diff = Date.now() - t;
  if (diff < 0) return 'baru saja';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export function magColor(mag: number): string {
  if (mag >= 6) return '#b91c1c'; // red-700
  if (mag >= 5) return '#ea580c'; // orange-600
  return '#1d4ed8'; // blue-700
}

export function magLabel(mag: number): string {
  if (mag >= 6) return 'Kuat (≥6)';
  if (mag >= 5) return 'Sedang (5–5,9)';
  return 'Ringan (<5)';
}

export function isTsunamiPotential(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('potensi') || s.includes('berpotensi') || (!s.includes('tidak') && s.includes('tsunami') === false ? false : s.includes('potensi'));
}
