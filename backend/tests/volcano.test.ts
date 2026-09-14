process.env.DB_DISABLED = '1';

import request from 'supertest';
import { createApp } from '../src/app';
import { parseActivityHtml } from '../src/volcano/scrape';
import { VolcanoStore } from '../src/volcano/store';
import { resetVolcanoStatus, syncVolcanoesOnce } from '../src/volcano/sync';
import { volcanoStore } from '../src/volcano/store';
import { slugify } from '../src/volcano/types';

/** Cuplikan markup meniru tabel MAGMA (bukan halaman penuh, bukan data live). */
const FIXTURE_HTML = `
<table>
  <tbody>
    <tr>
      <td>Level III (Siaga)</td>
      <td>5</td>
      <td>
        Anak Krakatau - Lampung
        <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/123?signature=abc">Lihat laporan</a><br>
        Merapi - DIY dan Jawa Tengah
        <a href="/v1/gunung-api/laporan/456?signature=def">Lihat laporan</a>
      </td>
    </tr>
    <tr>
      <td>Level II (Waspada)</td>
      <td>1</td>
      <td>
        Slamet - Jawa Tengah
        <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/789?signature=ghi">Lihat laporan</a>
      </td>
    </tr>
  </tbody>
</table>
`;

describe('parseActivityHtml (fixture, tanpa network)', () => {
  it('mengekstrak nama, level, provinsi, dan id laporan', () => {
    const rows = parseActivityHtml(FIXTURE_HTML);
    expect(rows).toHaveLength(3);

    const krakatau = rows.find((r) => r.name === 'Anak Krakatau');
    expect(krakatau).toMatchObject({
      level: 3,
      level_name: 'Siaga',
      province: 'Lampung',
      report_id: '123',
    });
    expect(krakatau!.report_url).toContain('/v1/gunung-api/laporan/123');

    const merapi = rows.find((r) => r.name === 'Merapi');
    expect(merapi).toMatchObject({ level: 3, report_id: '456' });
    expect(merapi!.report_url).toMatch(/^https:\/\/magma\.esdm\.go\.id\//);

    const slamet = rows.find((r) => r.name === 'Slamet');
    expect(slamet).toMatchObject({ level: 2, level_name: 'Waspada', report_id: '789' });
  });

  it('mengabaikan teks level yang tidak dikenal', () => {
    const rows = parseActivityHtml(`
      <table><tbody>
        <tr><td>Level IX (Bahaya Sekali)</td><td>1</td><td>Fiktif - Nowhere <a href="/v1/gunung-api/laporan/999">Lihat laporan</a></td></tr>
        <tr><td>Bukan level</td><td>2</td><td>Asal - Sana <a href="/x/1">Lihat laporan</a></td></tr>
      </tbody></table>
    `);
    expect(rows).toHaveLength(0);
  });

  it('HTML kosong → array kosong (tidak melempar)', () => {
    expect(parseActivityHtml('')).toEqual([]);
  });

  it('markup rowspan asli MAGMA: header level dan gunung di <tr> berbeda', () => {
    const rows = parseActivityHtml(`
      <table><tbody>
        <tr>
          <td rowspan="2"><a href="">Level III (Siaga)</a><span>Hasil pengamatan...</span></td>
          <td rowspan="2">1</td>
        </tr>
        <tr><td>
          Semeru - Jawa Timur
          <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325818?signature=xyz"><i></i>Lihat laporan</a><br>
        </td></tr>
        <tr>
          <td rowspan="2"><a href="">Level II (Waspada)</a></td>
          <td rowspan="2">1</td>
        </tr>
        <tr><td>
          Bromo - Jawa Timur
          <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/111?signature=abc">Lihat laporan</a>
        </td></tr>
      </tbody></table>
    `);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.name === 'Semeru')).toMatchObject({
      level: 3,
      level_name: 'Siaga',
      province: 'Jawa Timur',
      report_id: '325818',
    });
    expect(rows.find((r) => r.name === 'Bromo')).toMatchObject({
      level: 2,
      level_name: 'Waspada',
      report_id: '111',
    });
  });
});

describe('VolcanoStore dedupe', () => {
  it('scrape yang sama dua kali → ukuran stabil + external_id stabil', () => {
    const store = new VolcanoStore();
    const first = store.upsert(parseActivityHtml(FIXTURE_HTML), '2026-09-14T00:00:00.000Z');
    const second = store.upsert(parseActivityHtml(FIXTURE_HTML), '2026-09-14T01:00:00.000Z');
    expect(store.size()).toBe(3);
    expect(first.map((v) => v.external_id).sort()).toEqual(second.map((v) => v.external_id).sort());
    expect(first.map((v) => v.id).sort()).toEqual(second.map((v) => v.id).sort());
    // observed_at ikut fetch terbaru, received_at pertama dipertahankan.
    const krakatau = store.getBySlug('anak-krakatau')!;
    expect(krakatau.observed_at).toBe('2026-09-14T01:00:00.000Z');
    expect(krakatau.received_at).toBe('2026-09-14T00:00:00.000Z');
  });

  it('allSorted mengurutkan level desc lalu nama', () => {
    const store = new VolcanoStore();
    store.upsert(parseActivityHtml(FIXTURE_HTML), '2026-09-14T00:00:00.000Z');
    const names = store.allSorted().map((v) => v.name);
    expect(names).toEqual(['Anak Krakatau', 'Merapi', 'Slamet']);
  });

  it('koordinat bawaan terisi untuk gunung dikenal', () => {
    const store = new VolcanoStore();
    store.upsert(parseActivityHtml(FIXTURE_HTML), '2026-09-14T00:00:00.000Z');
    const merapi = store.getBySlug(slugify('Merapi'))!;
    expect(merapi.latitude).toBeCloseTo(-7.542, 2);
    expect(merapi.longitude).toBeCloseTo(110.442, 2);
  });
});

describe('syncVolcanoesOnce (fetch dimock, tanpa network)', () => {
  beforeEach(() => {
    volcanoStore.clear();
    resetVolcanoStatus();
  });

  it('berhasil mengisi store dari HTML mock', async () => {
    const res = await syncVolcanoesOnce(async () => FIXTURE_HTML);
    expect(res.ok).toBe(true);
    expect(res.total).toBe(3);
    expect(volcanoStore.size()).toBe(3);
  });

  it('gagal fetch → { ok:false }, tidak melempar', async () => {
    const res = await syncVolcanoesOnce(async () => {
      throw new Error('network down');
    });
    expect(res.ok).toBe(false);
    expect(volcanoStore.size()).toBe(0);
  });
});

describe('API gunung api (store pre-seed, tanpa network)', () => {
  const app = createApp();

  beforeEach(() => {
    volcanoStore.clear();
    resetVolcanoStatus();
    volcanoStore.upsert(parseActivityHtml(FIXTURE_HTML), '2026-09-14T00:00:00.000Z');
  });

  it('GET /api/volcanoes → { data, meta }', async () => {
    const res = await request(app).get('/api/volcanoes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({
      total: 3,
      counts: { siaga: 2, waspada: 1, awas: 0, normal: 0 },
    });
    // Urutan: Siaga dulu.
    expect(res.body.data[0].level).toBe(3);
  });

  it('GET /api/volcanoes/levels → counts + kelompok', async () => {
    const res = await request(app).get('/api/volcanoes/levels');
    expect(res.status).toBe(200);
    const siaga = res.body.data.find((g: { level: number }) => g.level === 3);
    expect(siaga.count).toBe(2);
    expect(siaga.volcanoes.map((v: { name: string }) => v.name).sort()).toEqual([
      'Anak Krakatau',
      'Merapi',
    ]);
    const awas = res.body.data.find((g: { level: number }) => g.level === 4);
    expect(awas.count).toBe(0);
  });

  it('GET /api/volcanoes/:slug → 200 + unknown → 404', async () => {
    const ok = await request(app).get('/api/volcanoes/merapi');
    expect(ok.status).toBe(200);
    expect(ok.body.data.name).toBe('Merapi');
    expect(ok.body.data).toHaveProperty('latitude');

    const miss = await request(app).get('/api/volcanoes/tidak-ada-gunung');
    expect(miss.status).toBe(404);
    expect(miss.body.error).toHaveProperty('message');
  });
});
