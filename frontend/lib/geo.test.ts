import { formatDistance, haversineKm, magColor, relativeTime } from './geo';

describe('geo utils', () => {
  it('menghitung jarak haversine Jakarta–Bandung', () => {
    const km = haversineKm(-6.2, 106.85, -6.9, 107.6);
    expect(km).toBeGreaterThan(100);
    expect(km).toBeLessThan(180);
  });

  it('memformat jarak', () => {
    expect(formatDistance(183.4)).toBe('183 km');
    expect(formatDistance(0.4)).toBe('400 m');
  });

  it('memetakan warna magnitudo sesuai konvensi seismik', () => {
    expect(magColor(4.5)).toBe('#1d4ed8');
    expect(magColor(5.2)).toBe('#ea580c');
    expect(magColor(6.1)).toBe('#b91c1c');
  });

  it('relativeTime menangani data kosong', () => {
    expect(relativeTime(null)).toBe('belum ada data');
    expect(relativeTime(new Date().toISOString())).toBe('baru saja');
  });
});
