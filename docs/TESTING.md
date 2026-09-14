# Panduan Testing & QA

## Backend (`cd backend`, `npm test`)

| File | Cakupan |
| ---- | ------- |
| `tests/normalize.test.ts` | parsing koordinat/kedalaman/magnitudo, `external_id` stabil |
| `tests/distance.test.ts` | haversine (Jakarta–Bandung ±115 km, titik sama = 0) |
| `tests/validation.test.ts` | limit/page/magnitudo/tanggal valid & invalid |
| `tests/duplicate.test.ts` | item sama 2× → satu `external_id` / satu baris store |
| `tests/volcano.test.ts` | parse HTML MAGMA (termasuk markup rowspan asli), dedupe store, sync mock, API supertest |
| `tests/weather.test.ts` | parse RSS nowcast, normalisasi 2 bentuk forecast (termasuk Sorong tanpa lokasi atas), adm4 invalid, dedup cache, API mock |
| `tests/tsunami.test.ts` | parse CAP InaTEWS (warning/ended/duplikat/koordinat LS-BT/WIB→UTC), dedupe store, sync emit, API mock + stale |
| `tests/api.test.ts` | supertest: health 200, list shape, limit invalid → 400, search kosong |

## Frontend (`cd frontend`)

- `npm test` — unit `lib/geo` (haversine, format jarak/waktu).
- `npm run cypress:run` — E2E:
  - `dashboard.cy.ts` — peta + daftar terbaru tampil (API di-intercept).
  - `history.cy.ts` — filter magnitudo mempersempit tabel.
  - `quake-detail.cy.ts` — halaman detail menampilkan info + shakemap.
  - `volcano.cy.ts` — tabel gunung api + filter level Siaga.
  - `weather.cy.ts` — pencarian lokasi + prakiraan + peringatan (di-intercept).
  - `tsunami.cy.ts` — kartu peringatan PD + baris berakhir (di-intercept).

## Checklist manual (SQA)

1. Matikan internet → banner "Sumber data tidak tersedia", data terakhir tetap tampil.
2. Blokir hanya BMKG (atau hentikan polling) → status degradasi, tanpa crash.
3. Gempa baru (tunggu polling / trigger sinkronisasi) → marker + list + toast tanpa refresh.
4. Tolak izin lokasi → aplikasi normal, tanpa error.
5. Mobile 360px → peta 55vh, navigasi bawah, tabel scroll horizontal.
6. Keyboard: Tab melewati nav → list → filter; fokus terlihat.
