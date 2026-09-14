# Disaster Monitoring Indonesia

Aplikasi monitoring bencana Indonesia berbasis data realtime resmi **BMKG**
(Badan Meteorologi, Klimatologi, dan Geofisika) untuk gempa bumi, dan
**MAGMA Indonesia (PVMBG–Badan Geologi, Kementerian ESDM)** untuk aktivitas
gunung api.

> **Sumber data: BMKG** — `https://data.bmkg.go.id/DataMKG/TEWS/`
> (`autogempa.json`, `gempaterkini.json`, `gempadirasakan.json`).
> **Sumber data: MAGMA** — `https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas`
> (halaman tingkat aktivitas gunung api).
> Aplikasi ini adalah visualisasi/monitoring independen, **bukan** situs resmi
> BMKG maupun PVMBG.

## Arsitektur

```text
BMKG gempa (polling 60 dtk) ─┐
                             ├→ Backend (Express) → MySQL
MAGMA gunung api (poll 15 mnt)┘          ├─ REST API → Frontend (Next.js)
                                         └─ Socket.IO → Frontend (realtime, tanpa refresh)
```

| Direktori   | Isi                                   | Port default |
| ----------- | ------------------------------------- | ------------ |
| `backend/`  | Express + TypeScript + Socket.IO + MySQL (mysql2), Jest | 4000 |
| `frontend/` | Next.js 14 + TypeScript + Tailwind + Leaflet + Cypress | 3000 |

## Menjalankan (development)

### 1. Database

```powershell
docker compose up -d db
```

Lalu import skema: `backend/schema.sql`.

### 2. Backend

```powershell
cd backend
copy .env.example .env   # sesuaikan DB_*
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" install
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

> Backend tetap berjalan walau MySQL/BMKG down (mode degradasi:
> memakai data terakhir + status `unavailable`).

### 3. Frontend

```powershell
cd frontend
copy .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:4000
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" install
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

Buka `http://localhost:3000`.

## Menjalankan (Docker, semua layanan)

```powershell
docker compose up --build
```

## Testing

```powershell
# backend: unit + API
cd backend
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" test

# frontend: unit (geo) + Cypress E2E
cd frontend
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" test
node "$env:ProgramFiles\nodejs\node_modules\npm\bin\npm-cli.js" run cypress:run
```

## Endpoint backend

| Method | Endpoint | Keterangan |
| ------ | -------- | ---------- |
| GET | `/api/health` | status sistem, DB, BMKG, sinkronisasi terakhir |
| GET | `/api/earthquakes/latest` | gempa terbaru |
| GET | `/api/earthquakes` | list + paginasi (`limit,page,minMag,maxMag,q,from,to,sort`) |
| GET | `/api/earthquakes/history` | alias histori, filter sama |
| GET | `/api/earthquakes/:id` | detail by id numerik / external_id |
| GET | `/api/statistics` | statistik hari ini/7d/30d, distribusi, wilayah, timeline |
| GET | `/api/regions/search?q=` | pencarian wilayah Indonesia |
| GET | `/api/volcanoes` | daftar gunung api + hitungan level |
| GET | `/api/volcanoes/levels` | hitungan + pengelompokan per level |
| GET | `/api/volcanoes/:slug` | detail gunung api |
| GET | `/api/weather/locations?q=` | 39 lokasi kurasi (38 provinsi) untuk prakiraan |
| GET | `/api/weather/forecast?adm4=` | prakiraan 3 hari BMKG (400 adm4 invalid, 502 BMKG kosong) |
| GET | `/api/weather/alerts` | peringatan dini nowcast BMKG (stale bila hulu gagal) |
| GET | `/api/tsunami` | 30 buletin tsunami InaTEWS (peringatan + berakhir) |
| GET | `/api/tsunami/warnings` | buletin berstatus peringatan saja |

Event Socket.IO: `earthquake:new`, `status:update`, `volcano:update`, `weather:alerts`, `tsunami:update`.

## Halaman frontend

| Rute | Fungsi |
| ---- | ------ |
| `/` | dashboard: peta dominan + panel gempa terbaru + strip gunung api + banner cuaca/tsunami + statistik ringkas |
| `/gunung-api` | status gunung api: kartu level + peta marker segitiga + tabel + filter |
| `/gunung-api/[slug]` | detail gunung api + tautan laporan MAGMA |
| `/cuaca` | prakiraan BMKG per lokasi + daftar peringatan dini nowcast |
| `/tsunami` | buletin tsunami InaTEWS (peringatan + riwayat 30 event) |
| `/pantauan` | watchlist lokal (gunung/cuaca/gempa) + status + izin notifikasi |
| `/riwayat` | tabel histori + paginasi + filter |
| `/statistik` | agregat + chart ringan |
| `/gempa/[id]` | detail kejadian + shakemap + jarak pengguna |

## Status modul & sumber data

| Modul | Sumber | Status |
| ----- | ------ | ------ |
| Gempa bumi | BMKG TEWS JSON | ✅ produksi |
| Gunung api | MAGMA (scrape HTML) | ✅ produksi |
| Cuaca + peringatan dini | BMKG API publik + nowcast RSS | ✅ produksi |
| Tsunami | BMKG InaTEWS CAP | ✅ produksi (`cdn.bmkg.go.id/last30tsunamievent.xml`) |
| Arsip bencana (DIBI BNPB) | `dibi.bnpb.go.id` | ⏸️ ditunda — server BNPB tidak dapat diakses publik (HTTP 403/523, Sep 2026); diintegrasikan saat akses mesin tersedia |
| Hotspot karhutla | Sipongi KLHK / NASA FIRMS | ⏸️ ditunda — Sipongi butuh API key, FIRMS butuh MAP_KEY pribadi (gratis via Earthdata Login) |

## Catatan operasional

- Polling BMKG default 60 detik (`SYNC_INTERVAL_MS`), timeout 15 detik,
  toleran terhadap kegagalan parsial.
- Polling MAGMA default 15 menit (`VOLCANO_SYNC_INTERVAL_MS`) karena status
  level berubah lambat; halaman HTML di-parse dengan regex toleran (tanpa
  dependensi tambahan).
- Dedup gempa via `external_id = sha1(DateTime|Coordinates|Magnitude)`;
  dedup gunung via slug nama; dedup tsunami via `eventid` InaTEWS.
- Kelas error `UpstreamError` (502) membedakan "data hulu kosong" dari
  salah input (400): mis. BMKG kadang mengembalikan `cuaca: []` untuk
  wilayah tertentu (teramati: Kota Sorong).
- Jika BMKG/MAGMA tidak tersedia: tampilkan data terakhir + pesan
  "Sumber data sedang tidak tersedia".
