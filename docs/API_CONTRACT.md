# Kontrak API — Disaster Monitoring Indonesia

Basis: `http://localhost:4000`. Semua respons JSON.

## Bentuk gempa ternormalisasi (`Quake`)

```jsonc
{
  "id": 1,                       // id numerik DB (atau index in-memory)
  "external_id": "sha1(...)",
  "magnitude": 5.2,
  "depth_km": 10,
  "latitude": -9.52,
  "longitude": 112.85,
  "location": "156 km Tenggara KAB-MALANG-JATIM",
  "event_time": "2026-09-14T01:42:08.000Z",  // ISO
  "tsunami_status": "Tidak berpotensi tsunami" | null,
  "felt": "II-III Pacitan, ..." | null,      // skala MMI (dari gempadirasakan/autogempa)
  "shakemap": "20260914084208.mmi.jpg" | null,
  "shakemap_url": "https://data.bmkg.go.id/DataMKG/TEWS/20260914084208.mmi.jpg" | null,
  "source": "BMKG",
  "received_at": "2026-09-14T..."            // kapan aplikasi menerima
}
```

Frontend harus toleran: respons boleh `{ data: ... }` atau mentah.

## Endpoints

| Method | Path | Query | Respons |
| ------ | ---- | ----- | ------- |
| GET | `/api/health` | — | `{ status, db, bmkg, lastSyncAt, lastSuccessAt, uptime }` |
| GET | `/api/earthquakes/latest` | — | satu `Quake` |
| GET | `/api/earthquakes` | `limit(1..100,def 20) page minMag maxMag q from to sort` | `{ data: Quake[], meta: { page, limit, total, totalPages } }` |
| GET | `/api/earthquakes/history` | sama | sama |
| GET | `/api/earthquakes/:id` | id numerik atau `external_id` | satu `Quake` |
| GET | `/api/statistics` | — | `{ today, last7d, last30d, total, magDistribution, depthDistribution, topRegions, timeline }` |
| GET | `/api/regions/search?q=` | `q` min 1 huruf | `{ data: [{ name, province, latitude, longitude }] }` |

## Error

```jsonc
{ "error": { "message": "Pesan ramah (id)", "code": "BAD_REQUEST" } }
```

- `400` validasi gagal, `404` tidak ditemukan, `429` rate-limit, `5xx` gangguan.

## Gunung api (sumber: MAGMA Indonesia / PVMBG–Badan Geologi)

Diambil backend dengan mem-parse halaman
`https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas` tiap 15 menit
(`VOLCANO_SYNC_INTERVAL_MS`); koordinat dari tabel bawaan backend.

```jsonc
// GET /api/volcanoes → { data: Volcano[], meta: { total, counts } }
// GET /api/volcanoes/levels → { data: [{ level, level_name, count, volcanoes }], meta: {...} }
// GET /api/volcanoes/:slug → { data: Volcano }
{
  "slug": "merapi",                  // external_id
  "name": "Merapi",
  "province": "Daerah Istimewa Yogyakarta dan Jawa Tengah",
  "level": 3,                        // 1 Normal · 2 Waspada · 3 Siaga · 4 Awas
  "level_name": "Siaga",
  "latitude": -7.542,
  "longitude": 110.442,
  "elevation_m": 2910,               // null bila tak diketahui
  "report_url": "https://magma.esdm.go.id/v1/gunung-api/laporan/...",
  "source": "MAGMA",
  "observed_at": "2026-09-14T...",
  "received_at": "2026-09-14T..."
}
```

Catatan: `GET /api/volcanoes/levels` membungkus grup level dalam
`{ data: [...], meta: { total, counts } }` — frontend menormalisasi
kedua bentuk itu (lihat `fetchVolcanoLevels`).

## Cuaca (sumber: BMKG — api.bmkg.go.id + nowcast RSS)

Wajib mencantumkan BMKG sebagai sumber (syarat portal data terbuka BMKG).

```jsonc
// GET /api/weather/locations?q=bandung → { data: [{ adm4, provinsi, kotkab, kecamatan, desa }] }
//   39 lokasi kurasi (semua 38 provinsi; Kaltim 2). Cari case-insensitive, maks 20.
// GET /api/weather/forecast?adm4=32.73.01.1001 → { data: Forecast, meta: { source:'BMKG', credit } }
//   Forecast = { location: {adm4,provinsi,kotkab,kecamatan,desa,lon,lat}, days: [{ date, slots: [...] }], analysis_date }
//   Slot = { datetime, local_datetime, t, hu, weather, weather_desc, weather_desc_en, ws, wd, tcc, tp, vs_text, image }
//   400 bila adm4 hilang/invalid; 502 (UPSTREAM_ERROR) bila BMKG mengembalikan data kosong.
// GET /api/weather/alerts → { data: WeatherAlert[], meta: { total, observed_at, stale } }
//   WeatherAlert = { id, title, province, link, description, pub_date, severity: 'high'|'medium'|'low' }
//   Tidak pernah 500 karena hulu: gagal → cache terakhir + stale:true, atau kosong + stale:true.
```

Cache backend: prakiraan 30 menit, alerts 10 menit (+ dedup request
bersamaan) — BMKG lambat dari beberapa region (~17 dtk) dan dibatasi
60 req/menit/IP. Loop alerts tiap 10 menit (`WEATHER_SYNC_INTERVAL_MS`).

## Tsunami (sumber: BMKG InaTEWS — cdn.bmkg.go.id/last30tsunamievent.xml)

CAP 1.2: 30 event terakhir gempa berpotensi tsunami. Satu gempa dapat
memiliki banyak buletin (PD-1 s/d PD-4 + "telah berakhir").

```jsonc
// GET /api/tsunami → { data: TsunamiEvent[], meta: { total, warnings, observed_at, stale, source, info_url } }
// GET /api/tsunami/warnings → { data: [...status warning], meta: { count, ... } }
{
  "event_id": "20260815073130",
  "magnitude": 7.7,
  "depth_km": 15,
  "area": "30 km TimurLaut MBAY-NAGEKEO-NTT",
  "latitude": -8.41, "longitude": 121.39,
  "event_time": "2026-08-14T21:58:24.000Z",
  "status": "warning" | "ended",   // ended bila headline/deskripsi memuat "berakhir"
  "warning_level": "4",            // dari subject "Warning Tsunami PD-4"
  "potential": "Potensi TSUNAMI untuk diteruskan pada masyarakat",
  "headline": "...",
  "description": "...",
  "source": "BMKG-InaTEWS"
}
```

Loop tiap 10 menit (`TSUNAMI_SYNC_INTERVAL_MS`); emit `tsunami:update`
hanya saat ada `event_id` baru. Banner dashboard hanya menghitung
buletin ≤ 7 hari agar buletin arsip tidak terbaca sebagai darurat.

## Socket.IO (namespace `/`, host sama)

- `earthquake:new` → payload satu `Quake` baru.
- `volcano:update` → `{ changes: [{ slug, name, from, to }], observed_at }`.
- `weather:alerts` → `{ alerts, newIds, observed_at }` (hanya saat ada peringatan baru).
- `status:update` → `{ bmkg: 'ok'|'degraded'|'unavailable', lastSyncAt, lastSuccessAt }`.
