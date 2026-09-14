import { validateListQuery, ValidationError } from '../src/utils/validate';

describe('validateListQuery', () => {
  it('default: limit 20, page 1, sort desc', () => {
    const q = validateListQuery({});
    expect(q).toMatchObject({ limit: 20, page: 1, sort: 'desc' });
  });
  it('menolak limit di luar 1..100', () => {
    expect(() => validateListQuery({ limit: '0' })).toThrow(ValidationError);
    expect(() => validateListQuery({ limit: '101' })).toThrow(ValidationError);
    expect(() => validateListQuery({ limit: 'abc' })).toThrow(ValidationError);
  });
  it('menolak page < 1 dan mag di luar 0..10', () => {
    expect(() => validateListQuery({ page: '0' })).toThrow(ValidationError);
    expect(() => validateListQuery({ minMag: '11' })).toThrow(ValidationError);
    expect(() => validateListQuery({ maxMag: '-1' })).toThrow(ValidationError);
  });
  it('menolak minMag > maxMag dan tanggal rusak', () => {
    expect(() => validateListQuery({ minMag: '6', maxMag: '5' })).toThrow(ValidationError);
    expect(() => validateListQuery({ from: 'bukan-tanggal' })).toThrow(ValidationError);
  });
  it('menerima filter valid', () => {
    const q = validateListQuery({ limit: '10', page: '2', minMag: '5', sort: 'asc', q: 'jawa' });
    expect(q).toMatchObject({ limit: 10, page: 2, minMag: 5, sort: 'asc', q: 'jawa' });
  });
});
