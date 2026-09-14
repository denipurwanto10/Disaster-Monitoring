import {
  normalizeBmkgItem,
  parseCoordinates,
  parseDepth,
  parseMagnitude,
  toExternalId,
} from '../src/bmkg/normalize';

describe('parseCoordinates', () => {
  it('mem-parse "lat,lon" standar BMKG', () => {
    expect(parseCoordinates('-9.52,112.85')).toEqual([-9.52, 112.85]);
  });
  it('toleran spasi & minus unicode', () => {
    expect(parseCoordinates('−9.52, 112.85')).toEqual([-9.52, 112.85]);
  });
  it('menolak format rusak', () => {
    expect(parseCoordinates('tidak-valid')).toBeNull();
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates(undefined)).toBeNull();
    expect(parseCoordinates('999,999')).toBeNull();
  });
});

describe('parseDepth', () => {
  it('mem-parse "10 km"', () => {
    expect(parseDepth('10 km')).toBe(10);
  });
  it('mem-parse angka polos', () => {
    expect(parseDepth('123')).toBe(123);
  });
  it('null bila tidak ada angka', () => {
    expect(parseDepth('-')).toBeNull();
  });
});

describe('toExternalId', () => {
  it('deterministik: input sama → id sama', () => {
    const a = toExternalId('2026-09-14T08:42:08+07:00', '-9.52,112.85', '5.2');
    const b = toExternalId('2026-09-14T08:42:08+07:00', '-9.52,112.85', '5.2');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{40}$/);
  });
  it('berbeda bila salah satu komponen beda', () => {
    const a = toExternalId('2026-09-14T08:42:08+07:00', '-9.52,112.85', '5.2');
    const b = toExternalId('2026-09-14T08:42:08+07:00', '-9.52,112.85', '5.3');
    expect(a).not.toBe(b);
  });
});

describe('normalizeBmkgItem', () => {
  const base = {
    Tanggal: '14 Sep 2026',
    Jam: '08:42:08 WIB',
    DateTime: '2026-09-14T08:42:08+07:00',
    Coordinates: '-9.52,112.85',
    Lintang: '9.52 LS',
    Bujur: '112.85 BT',
    Magnitude: '5.2',
    Kedalaman: '10 km',
    Wilayah: 'Selatan Jawa Timur',
    Potensi: 'Tidak berpotensi tsunami',
    Dirasakan: 'III Lumajang',
    Shakemap: '20260914084208.mmi.jpg',
  };

  it('normalisasi item autogempa penuh', () => {
    const n = normalizeBmkgItem(base);
    expect(n).not.toBeNull();
    expect(n!.magnitude).toBe(5.2);
    expect(n!.depth_km).toBe(10);
    expect(n!.latitude).toBe(-9.52);
    expect(n!.tsunami_status).toBe('Tidak berpotensi tsunami');
    expect(n!.felt).toBe('III Lumajang');
    expect(n!.shakemap).toBe('20260914084208.mmi.jpg');
  });

  it('toleran: gempadirasakan tanpa Potensi → tsunami_status null, Dirasakan → felt', () => {
    const { Potensi: _drop, ...dirasakan } = base;
    const n = normalizeBmkgItem(dirasakan);
    expect(n).not.toBeNull();
    expect(n!.tsunami_status).toBeNull();
    expect(n!.felt).toBe('III Lumajang');
  });

  it('null bila koordinat/magnitudo/waktu rusak', () => {
    expect(normalizeBmkgItem({ ...base, Coordinates: 'rusak' })).toBeNull();
    expect(normalizeBmkgItem({ ...base, Magnitude: '??' })).toBeNull();
    expect(normalizeBmkgItem({ ...base, DateTime: 'bukan-tanggal' })).toBeNull();
  });
});
