process.env.DB_DISABLED = '1';

import request from 'supertest';
import { normalizeBmkgItem } from '../src/bmkg/normalize';
import { createApp } from '../src/app';
import { memoryStore } from '../src/store';

const app = createApp();

beforeEach(() => {
  memoryStore.clear();
  const seed = [
    {
      DateTime: '2026-09-14T08:42:08+07:00',
      Coordinates: '-9.52,112.85',
      Magnitude: '5.2',
      Kedalaman: '10 km',
      Wilayah: 'Selatan Jawa Timur',
      Potensi: 'Tidak berpotensi tsunami',
      Shakemap: '20260914084208.mmi.jpg',
    },
    {
      DateTime: '2026-09-13T10:00:00+07:00',
      Coordinates: '1.47,124.84',
      Magnitude: '4.1',
      Kedalaman: '120 km',
      Wilayah: 'Manado, Sulawesi Utara',
      Dirasakan: 'II Manado',
    },
  ];
  for (const s of seed) {
    const n = normalizeBmkgItem(s);
    if (n) memoryStore.upsert(n);
  }
});

describe('API (in-memory store)', () => {
  it('GET /api/health → 200 dengan field status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('bmkg');
  });

  it('GET /api/earthquakes → array + meta', async () => {
    const res = await request(app).get('/api/earthquakes?limit=10');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty('magnitude');
    expect(res.body.data[0]).toHaveProperty('location');
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10 });
  });

  it('GET /api/earthquakes?limit=999 → 400 { error }', async () => {
    const res = await request(app).get('/api/earthquakes?limit=999');
    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('code');
  });

  it('GET /api/regions/search tanpa q → array kosong', async () => {
    const res = await request(app).get('/api/regions/search');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('GET /api/statistics → ringkasan valid', async () => {
    const res = await request(app).get('/api/statistics');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.magDistribution['<5'] + res.body.magDistribution['5-5.9'] + res.body.magDistribution['6+']).toBe(2);
    expect(Array.isArray(res.body.timeline)).toBe(true);
  });
});
