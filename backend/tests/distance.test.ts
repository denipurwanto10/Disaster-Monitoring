import { formatDistance, haversineKm } from '../src/utils/distance';

describe('haversineKm', () => {
  it('titik sama → 0', () => {
    expect(haversineKm(-6.2, 106.8, -6.2, 106.8)).toBeCloseTo(0, 6);
  });
  it('Jakarta–Bandung ≈ 115 km (toleransi ±10 km)', () => {
    const d = haversineKm(-6.2088, 106.8456, -6.9175, 107.6191);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(130);
  });
  it('simetris', () => {
    const a = haversineKm(0, 0, 1, 1);
    const b = haversineKm(1, 1, 0, 0);
    expect(a).toBeCloseTo(b, 9);
  });
});

describe('formatDistance', () => {
  it('format meter & km', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(12.345)).toBe('12.3 km');
    expect(formatDistance(150)).toBe('150 km');
    expect(formatDistance(NaN)).toBe('-');
  });
});
