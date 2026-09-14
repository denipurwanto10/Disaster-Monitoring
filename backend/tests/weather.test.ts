process.env.DB_DISABLED = '1';

import request from 'supertest';
import { createApp } from '../src/app';
import { ValidationError } from '../src/utils/validate';
import { TtlCache, clearWeatherCache } from '../src/weather/cache';
import { CURATED_LOCATIONS } from '../src/weather/locations';
import { resetWeatherStatus } from '../src/weather/sync';

jest.mock('../src/weather/client', () => {
  const actual = jest.requireActual('../src/weather/client');
  return { ...actual, fetchForecastJson: jest.fn(), fetchAlertsXml: jest.fn() };
});

type ClientMock = { fetchForecastJson: jest.Mock; fetchAlertsXml: jest.Mock };
type ClientReal = typeof import('../src/weather/client');

const mocked = jest.requireMock('../src/weather/client') as ClientMock;
const real = jest.requireActual('../src/weather/client') as ClientReal;

const app = createApp();

/* ---------- fixture: RSS nowcast 2 item (inline, tanpa network) ---------- */
const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>BMKG Nowcast</title>
<item>
<title>Hujan Lebat disertai Petir di Jambi</title>
<link>https://www.bmkg.go.id/alerts/nowcast/jambi_alert.xml</link>
<description><![CDATA[Waspada hujan lebat disertai petir di kecamatan Telanaipura dan sekitarnya, berlangsung hingga pukul 15:00 WIB.]]></description>
<guid>https://www.bmkg.go.id/alerts/nowcast/jambi_alert.xml</guid>
<pubDate>Sat, 12 Sep 2026 01:55:00 +0700</pubDate>
</item>
<item>
<title>Hujan Ringan di Bandung</title>
<link>https://www.bmkg.go.id/alerts/nowcast/jabar_alert.xml</link>
<description>Gerimis ringan di wilayah Bandung dan sekitarnya.</description>
<guid>jabar-123</guid>
<pubDate>Sat, 12 Sep 2026 02:00:00 +0700</pubDate>
</item>
</channel></rss>`;

function slot(local: string, weather: number, desc: string) {
  return {
    datetime: local.replace(' ', 'T') + ':00Z',
    local_datetime: local,
    t: 28,
    hu: 80,
    weather,
    weather_desc: desc,
    weather_desc_en: desc,
    ws: 10,
    wd: 'Timur',
    tcc: 50,
    tp: 0,
    vs_text: 'Sedang',
    image: 'https://api.bmkg.go.id/icon.png',
    analysis_date: '2026-09-12T00:00:00+07:00',
  };
}

const LOK_JAKARTA = {
  adm4: '31.71.03.1001',
  provinsi: 'DKI Jakarta',
  kotkab: 'Kota Adm. Jakarta Pusat',
  kecamatan: 'Kemayoran',
  desa: 'Kemayoran',
  lon: 106.8,
  lat: -6.16,
  timezone: '+0700',
};

/** Bentuk A: lokasi tingkat atas + data[0].lokasi. */
const FORECAST_A = {
  lokasi: LOK_JAKARTA,
  data: [
    {
      lokasi: LOK_JAKARTA,
      cuaca: [
        [slot('2026-09-12 00:00', 60, 'Hujan Ringan'), slot('2026-09-12 03:00', 1, 'Cerah')],
        [slot('2026-09-13 00:00', 3, 'Berawan')],
      ],
    },
  ],
};

/** Bentuk B: tanpa lokasi tingkat atas (seperti Kota Sorong 92.71.01.1001). */
const FORECAST_B = {
  data: [
    {
      lokasi: {
        adm4: '96.71.01.1001',
        provinsi: 'Papua Barat Daya',
        kotkab: 'Kota Sorong',
        kecamatan: 'Sorong',
        desa: 'Remu Utara',
        lon: 131.25,
        lat: -0.88,
        timezone: '+0900',
      },
      cuaca: [[slot('2026-09-12 00:00', 60, 'Hujan Ringan')]],
    },
  ],
};

const noHttp = {
  get: async (): Promise<{ data: unknown }> => {
    throw new Error('HTTP tidak boleh dipanggil');
  },
};

beforeEach(() => {
  clearWeatherCache();
  resetWeatherStatus();
  mocked.fetchForecastJson.mockReset();
  mocked.fetchAlertsXml.mockReset();
  // Default: fetch "mock" mendelegasikan ke fungsi asli dengan HTTP stub (tanpa network).
  mocked.fetchForecastJson.mockImplementation((adm4: string) => real.fetchForecastJson(adm4, noHttp));
});

describe('parseNowcastRss (fixture, tanpa network)', () => {
  it('mengekstrak judul, provinsi, severity, dan link', () => {
    const alerts = real.parseNowcastRss(RSS_FIXTURE);
    expect(alerts).toHaveLength(2);

    expect(alerts[0]).toMatchObject({
      title: 'Hujan Lebat disertai Petir di Jambi',
      province: 'Jambi',
      severity: 'high',
      link: 'https://www.bmkg.go.id/alerts/nowcast/jambi_alert.xml',
      id: 'https://www.bmkg.go.id/alerts/nowcast/jambi_alert.xml',
      pub_date: 'Sat, 12 Sep 2026 01:55:00 +0700',
    });
    expect(alerts[0].description).toContain('Telanaipura');

    expect(alerts[1]).toMatchObject({
      title: 'Hujan Ringan di Bandung',
      province: 'Bandung',
      severity: 'low',
      link: 'https://www.bmkg.go.id/alerts/nowcast/jabar_alert.xml',
      id: 'jabar-123',
    });
  });
});

describe('normalizeForecast (fixture, tanpa network)', () => {
  it('menangani bentuk dengan lokasi tingkat atas', () => {
    const f = real.normalizeForecast(FORECAST_A, '31.71.03.1001');
    expect(f.location).toMatchObject({ adm4: '31.71.03.1001', provinsi: 'DKI Jakarta', desa: 'Kemayoran' });
    expect(f.days).toHaveLength(2);
    expect(f.days[0].date).toBe('2026-09-12');
    expect(f.days[0].slots).toHaveLength(2);
    expect(f.days[1].date).toBe('2026-09-13');
    expect(f.days[0].slots[0]).toMatchObject({ weather: 60, weather_desc: 'Hujan Ringan' });
  });

  it('menangani bentuk data-only ala Sorong (tanpa lokasi tingkat atas)', () => {
    const f = real.normalizeForecast(FORECAST_B, '96.71.01.1001');
    expect(f.location).toMatchObject({ adm4: '96.71.01.1001', provinsi: 'Papua Barat Daya', kotkab: 'Kota Sorong' });
    expect(f.days).toHaveLength(1);
    expect(f.days[0].date).toBe('2026-09-12');
    expect(f.days[0].slots).toHaveLength(1);
  });
});

describe('validasi adm4', () => {
  it('adm4 tidak valid → ValidationError tanpa memanggil HTTP', async () => {
    await expect(real.fetchForecastJson('bogus', noHttp)).rejects.toBeInstanceOf(ValidationError);
    await expect(real.fetchForecastJson('31.71.03', noHttp)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('cache TTL + dedupe', () => {
  it('kunci sama dua kali → fn hanya dipanggil sekali', async () => {
    const cache = new TtlCache();
    const fn = jest.fn().mockResolvedValue(42);
    await expect(cache.getOrFetch('k', 60000, fn)).resolves.toBe(42);
    await expect(cache.getOrFetch('k', 60000, fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('dua panggilan paralel → fn hanya dipanggil sekali (in-flight dedupe)', async () => {
    const cache = new TtlCache();
    const fn = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('v'), 20)),
    );
    const [a, b] = await Promise.all([cache.getOrFetch('k', 60000, fn), cache.getOrFetch('k', 60000, fn)]);
    expect(a).toBe('v');
    expect(b).toBe('v');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('API /api/weather (fetch di-mock, tanpa network)', () => {
  it('daftar kurasi mencakup 38 provinsi', () => {
    const prov = new Set(CURATED_LOCATIONS.map((l) => l.provinsi));
    expect(prov.size).toBe(38);
  });

  it('GET /api/weather/locations?q=bandung → memuat Bandung', async () => {
    const res = await request(app).get('/api/weather/locations?q=bandung');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((l: { kotkab: string }) => l.kotkab.includes('Bandung'))).toBe(true);
  });

  it('GET /api/weather/forecast tanpa adm4 → 400', async () => {
    const res = await request(app).get('/api/weather/forecast');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/weather/forecast?adm4=tidak-valid → 400', async () => {
    const res = await request(app).get('/api/weather/forecast?adm4=bogus');
    expect(res.status).toBe(400);
  });

  it('GET /api/weather/forecast?adm4=valid → 200 dengan shape prakiraan', async () => {
    mocked.fetchForecastJson.mockImplementation(async () => real.normalizeForecast(FORECAST_A, '31.71.03.1001'));
    const res = await request(app).get('/api/weather/forecast?adm4=31.71.03.1001');
    expect(res.status).toBe(200);
    expect(res.body.data.location).toMatchObject({ adm4: '31.71.03.1001' });
    expect(Array.isArray(res.body.data.days)).toBe(true);
    expect(res.body.data.days[0].slots.length).toBeGreaterThan(0);
  });

  it('GET /api/weather/forecast saat upstream gagal → 502', async () => {
    mocked.fetchForecastJson.mockRejectedValue(new Error('BMKG lambat'));
    const res = await request(app).get('/api/weather/forecast?adm4=31.71.03.1001');
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/weather/alerts → {data, meta}', async () => {
    mocked.fetchAlertsXml.mockImplementation(async () => real.parseNowcastRss(RSS_FIXTURE));
    const res = await request(app).get('/api/weather/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 2, stale: false });
  });

  it('GET /api/weather/alerts saat upstream gagal → 200 stale, bukan 500', async () => {
    mocked.fetchAlertsXml.mockRejectedValue(new Error('BMKG down'));
    const res = await request(app).get('/api/weather/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ stale: true });
  });
});
