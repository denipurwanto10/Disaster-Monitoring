import { normalizeBmkgItem } from '../src/bmkg/normalize';
import { MemoryStore } from '../src/store';

const item = {
  DateTime: '2026-09-14T08:42:08+07:00',
  Coordinates: '-9.52,112.85',
  Magnitude: '5.2',
  Kedalaman: '10 km',
  Wilayah: 'Selatan Jawa Timur',
  Potensi: 'Tidak berpotensi tsunami',
};

describe('dedupe', () => {
  it('item sama dua kali → external_id sama', () => {
    const a = normalizeBmkgItem(item)!;
    const b = normalizeBmkgItem({ ...item })!;
    expect(a.external_id).toBe(b.external_id);
  });

  it('store upsert menyimpan satu baris untuk id yang sama', () => {
    const store = new MemoryStore();
    const a = normalizeBmkgItem(item)!;
    const r1 = store.upsert(a);
    const r2 = store.upsert(normalizeBmkgItem({ ...item, Wilayah: 'Update wilayah' })!);
    expect(r1.isNew).toBe(true);
    expect(r2.isNew).toBe(false);
    expect(store.size()).toBe(1);
    expect(store.getByExternal(a.external_id)!.location).toBe('Update wilayah');
  });
});
