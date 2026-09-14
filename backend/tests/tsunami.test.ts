process.env.DB_DISABLED = '1';

import request from 'supertest';
import { createApp } from '../src/app';
import { clearTsunamiCache } from '../src/tsunami/routes';
import { resetTsunamiStatus, setTsunamiEmitter, syncTsunamiOnce } from '../src/tsunami/sync';
import { TsunamiStore } from '../src/tsunami/store';

jest.mock('../src/tsunami/client', () => {
  const actual = jest.requireActual('../src/tsunami/client');
  return { ...actual, fetchTsunamiFeed: jest.fn() };
});

type ClientMock = { fetchTsunamiFeed: jest.Mock };

const mocked = jest.requireMock('../src/tsunami/client') as ClientMock;

const app = createApp();

/* ---------- fixture: CAP InaTEWS 3 blok <info> (1 duplikat eventid) ---------- */
const CAP_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
<identifier>BMKG-InaTEWS</identifier>
<info>
<eventid>20260815073130</eventid>
<magnitude>7.1</magnitude>
<depth>10 km</depth>
<area>Pusat gempa berada di laut 85 km barat daya Labuan Bajo</area>
<date>15-08-26</date>
<time>07:31:30 WIB</time>
<latitude>8.41 LS</latitude>
<longitude>121.39 BT</longitude>
<potential>Potensi TSUNAMI untuk diteruskan pada masyarakat</potential>
<subject>Warning Tsunami PD-2</subject>
<headline>Peringatan Dini Tsunami akibat gempa M7.1 di Nusa Tenggara Timur</headline>
<description>Waspada potensi tsunami. Ikuti arahan BMKG dan BPBD setempat.</description>
<sent>2026-08-15T07:36:30+07:00</sent>
</info>
<info>
<eventid>20260814051210</eventid>
<magnitude>6.5</magnitude>
<depth>20 km</depth>
<area>Pusat gempa berada di laut 120 km selatan Pacitan</area>
<date>14-08-26</date>
<time>05:12:10 WIB</time>
<point><coordinates>111.05,-9.20</coordinates></point>
<potential>Potensi TSUNAMI untuk diteruskan pada masyarakat</potential>
<subject>Warning Tsunami PD-4</subject>
<headline>Peringatan dini tsunami akibat gempa M6.5 dinyatakan telah berakhir</headline>
<description>Hasil monitoring menunjukkan ancaman tsunami dinyatakan telah berakhir.</description>
<sent>2026-08-14T06:00:00+07:00</sent>
</info>
<info>
<eventid>20260815073130</eventid>
<magnitude>7.1</magnitude>
<depth>10 km</depth>
<area>Duplikat peristiwa yang sama</area>
<date>15-08-26</date>
<time>07:31:30 WIB</time>
<latitude>8.41 LS</latitude>
<longitude>121.39 BT</longitude>
<potential>Potensi TSUNAMI untuk diteruskan pada masyarakat</potential>
<subject>Warning Tsunami PD-2</subject>
<headline>Duplikat</headline>
<description>Duplikat.</description>
<sent>2026-08-15T07:36:30+07:00</sent>
</info>
</alert>`;

const EV_OLD = {
  event_id: '20260814051210',
  magnitude: 6.5,
  depth_km: 20,
  area: 'Pacitan',
  latitude: -9.2,
  longitude: 111.05,
  event_time: '2026-08-13T22:12:10.000Z',
  status: 'ended' as const,
  warning_level: '4',
  potential: 'p',
  headline: 'h',
  description: 'd',
  source: 'BMKG-InaTEWS' as const,
};

const EV_NEW = {
  event_id: '20260815073130',
  magnitude: 7.1,
  depth_km: 10,
  area: 'Labuan Bajo',
  latitude: -8.41,
  longitude: 121.39,
  event_time: '2026-08-15T00:31:30.000Z',
  status: 'warning' as const,
  warning_level: '2',
  potential: 'p',
  headline: 'h',
  description: 'd',
  source: 'BMKG-InaTEWS' as const,
};

beforeEach(() => {
  clearTsunamiCache();
  resetTsunamiStatus();
  setTsunamiEmitter(null);
  mocked.fetchTsunamiFeed.mockReset();
});

describe('parseTsunamiFeed (fixture CAP, tanpa network)', () => {
  it('dedupe eventid, urut desc, status/level/koordinat benar', () => {
    const events = realParse(CAP_FIXTURE);
    expect(events).toHaveLength(2);

    // Terbaru dulu.
    expect(events[0].event_id).toBe('20260815073130');
    expect(events[1].event_id).toBe('20260814051210');

    // Warning PD-2 dengan koordinat LS/BT → lat negatif.
    expect(events[0]).toMatchObject({
      status: 'warning',
      warning_level: '2',
      latitude: -8.41,
      longitude: 121.39,
      magnitude: 7.1,
      depth_km: 10,
      source: 'BMKG-InaTEWS',
    });
    expect(events[0].area).toContain('Labuan Bajo');

    // Ended via headline "telah berakhir", koordinat dari <point> lon,lat.
    expect(events[1]).toMatchObject({
      status: 'ended',
      warning_level: '4',
      latitude: -9.2,
      longitude: 111.05,
    });
  });

  it('waktu WIB dikonversi ke ISO UTC', () => {
    const events = realParse(CAP_FIXTURE);
    // 15-08-26 07:31:30 WIB (+07:00) → 00:31:30 UTC.
    expect(events[0].event_time).toBe('2026-08-15T00:31:30.000Z');
    expect(events[1].event_time).toBe('2026-08-13T22:12:10.000Z');
  });

  it('XML sampah → [] (tidak melempar)', () => {
    expect(realParse('')).toEqual([]);
    expect(realParse('bukan xml sama sekali <foo')).toEqual([]);
    expect(realParse('<alert><info><magnitude>5</magnitude></info></alert>')).toEqual([]);
  });

  it('helper tag/parseLatLon diekspor untuk pengujian', async () => {
    const parse = (await import('../src/tsunami/parse')) as typeof import('../src/tsunami/parse');
    expect(parse.tag('<a><eventid> 123 </eventid></a>', 'eventid')).toBe('123');
    // BB → bujur negatif; LU → lintang positif.
    const ll = parse.parseLatLon('<info><latitude>1.5 LU</latitude><longitude>100.2 BB</longitude></info>');
    expect(ll).toMatchObject({ latitude: 1.5, longitude: -100.2 });
  });
});

function realParse(xml: string) {
  // Lewat fungsi asli (bukan mock) agar deterministik tanpa network.
  const parse = jest.requireActual('../src/tsunami/parse') as typeof import('../src/tsunami/parse');
  return parse.parseTsunamiFeed(xml);
}

describe('TsunamiStore', () => {
  it('dedupe + received_at pertama stabil + warnings filter', () => {
    const store = new TsunamiStore();
    const first = store.upsert([EV_NEW, EV_OLD], '2026-08-15T01:00:00.000Z');
    expect(first).toHaveLength(2);
    expect(store.size()).toBe(2);

    const second = store.upsert([{ ...EV_NEW, magnitude: 7.2 }], '2026-08-15T02:00:00.000Z');
    expect(store.size()).toBe(2);
    expect(second[0].received_at).toBe('2026-08-15T01:00:00.000Z');
    expect(second[0].magnitude).toBe(7.2);

    expect(store.allSorted()[0].event_id).toBe(EV_NEW.event_id);
    expect(store.activeWarnings().map((e) => e.event_id)).toEqual([EV_NEW.event_id]);
  });
});

describe('syncTsunamiOnce (tanpa network)', () => {
  it('tidak emit pada prime pertama; emit saat ada event_id baru', async () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    setTsunamiEmitter((event, payload) => emitted.push({ event, payload }));

    const r1 = await syncTsunamiOnce(async () => [EV_OLD]);
    expect(r1.ok).toBe(true);
    expect(r1.newIds).toEqual([EV_OLD.event_id]);
    expect(emitted).toHaveLength(0);

    const r2 = await syncTsunamiOnce(async () => [EV_OLD, EV_NEW]);
    expect(r2.ok).toBe(true);
    expect(r2.newIds).toEqual([EV_NEW.event_id]);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('tsunami:update');

    // Tidak ada yang baru → tidak emit lagi.
    const r3 = await syncTsunamiOnce(async () => [EV_OLD, EV_NEW]);
    expect(r3.newIds).toEqual([]);
    expect(emitted).toHaveLength(1);
  });

  it('gagal fetch → ok:false tanpa melempar', async () => {
    const r = await syncTsunamiOnce(async () => {
      throw new Error('InaTEWS down');
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('InaTEWS down');
  });
});

describe('API /api/tsunami (fetch di-mock, tanpa network)', () => {
  it('GET /api/tsunami → {data, meta} + upsert ke store', async () => {
    const parse = jest.requireActual('../src/tsunami/parse') as typeof import('../src/tsunami/parse');
    mocked.fetchTsunamiFeed.mockImplementation(async () => parse.parseTsunamiFeed(CAP_FIXTURE));
    const res = await request(app).get('/api/tsunami');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 2, warnings: 1, stale: false });
    expect(res.body.meta.observed_at).toBeTruthy();
  });

  it('GET /api/tsunami/warnings → hanya peringatan aktif', async () => {
    const parse = jest.requireActual('../src/tsunami/parse') as typeof import('../src/tsunami/parse');
    mocked.fetchTsunamiFeed.mockImplementation(async () => parse.parseTsunamiFeed(CAP_FIXTURE));
    const res = await request(app).get('/api/tsunami/warnings');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ event_id: '20260815073130', status: 'warning' });
    expect(res.body.meta).toMatchObject({ count: 1, stale: false });
  });

  it('GET /api/tsunami saat upstream gagal → 200 stale, bukan 500', async () => {
    mocked.fetchTsunamiFeed.mockRejectedValue(new Error('InaTEWS down'));
    const res = await request(app).get('/api/tsunami');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ stale: true });
  });
});
