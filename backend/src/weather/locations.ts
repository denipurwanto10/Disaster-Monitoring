import type { WeatherLocation } from './types.js';

/**
 * Daftar lokasi kabupaten/kota terverifikasi (kode adm4 BMKG), satu per provinsi
 * (38 provinsi; Kalimantan Timur diwakili 2 kota). Sumber: API prakiraan BMKG.
 */
export const CURATED_LOCATIONS: WeatherLocation[] = [
  { adm4: '11.01.01.2001', provinsi: 'Aceh', kotkab: 'Aceh Selatan', kecamatan: 'Bakongan', desa: 'Keude Bakongan' },
  { adm4: '12.71.01.1001', provinsi: 'Sumatera Utara', kotkab: 'Kota Medan', kecamatan: 'Medan Kota', desa: 'Pasar Baru' },
  { adm4: '13.71.01.1001', provinsi: 'Sumatera Barat', kotkab: 'Kota Padang', kecamatan: 'Padang Selatan', desa: 'Belakang Pondok' },
  { adm4: '14.72.03.1001', provinsi: 'Riau', kotkab: 'Kota Dumai', kecamatan: 'Bukit Kapur', desa: 'Bukit Nenas' },
  { adm4: '15.71.01.1001', provinsi: 'Jambi', kotkab: 'Kota Jambi', kecamatan: 'Telanaipura', desa: 'Simpang IV Sipin' },
  { adm4: '16.71.01.1001', provinsi: 'Sumatera Selatan', kotkab: 'Kota Palembang', kecamatan: 'Ilir Barat Dua', desa: 'Tiga-puluh-lima Ilir' },
  { adm4: '17.71.01.1001', provinsi: 'Bengkulu', kotkab: 'Kota Bengkulu', kecamatan: 'Selebar', desa: 'Pagar Dewa' },
  { adm4: '18.03.01.1001', provinsi: 'Lampung', kotkab: 'Lampung Utara', kecamatan: 'Bukit Kemuning', desa: 'Bukit Kemuning' },
  { adm4: '19.01.01.1001', provinsi: 'Kepulauan Bangka Belitung', kotkab: 'Bangka', kecamatan: 'Sungailiat', desa: 'Sungailiat' },
  { adm4: '21.72.01.1001', provinsi: 'Kepulauan Riau', kotkab: 'Kota Tanjung Pinang', kecamatan: 'Tanjung Pinang Barat', desa: 'Tanjung Pinang Bara' },
  { adm4: '31.71.03.1001', provinsi: 'DKI Jakarta', kotkab: 'Kota Adm. Jakarta Pusat', kecamatan: 'Kemayoran', desa: 'Kemayoran' },
  { adm4: '32.73.01.1001', provinsi: 'Jawa Barat', kotkab: 'Kota Bandung', kecamatan: 'Sukasari', desa: 'Sukarasa' },
  { adm4: '33.74.01.1001', provinsi: 'Jawa Tengah', kotkab: 'Kota Semarang', kecamatan: 'Semarang Tengah', desa: 'Miroto' },
  { adm4: '34.71.01.1001', provinsi: 'DI Yogyakarta', kotkab: 'Kota Yogyakarta', kecamatan: 'Tegalrejo', desa: 'Kricak' },
  { adm4: '35.78.01.1001', provinsi: 'Jawa Timur', kotkab: 'Kota Surabaya', kecamatan: 'Karang Pilang', desa: 'Karang Pilang' },
  { adm4: '36.71.01.1001', provinsi: 'Banten', kotkab: 'Kota Tangerang', kecamatan: 'Tangerang', desa: 'Sukarasa' },
  { adm4: '51.71.01.1001', provinsi: 'Bali', kotkab: 'Kota Denpasar', kecamatan: 'Denpasar Selatan', desa: 'Serangan' },
  { adm4: '52.01.01.1001', provinsi: 'NTB', kotkab: 'Lombok Barat', kecamatan: 'Gerung', desa: 'Gerung Utara' },
  { adm4: '53.71.01.1001', provinsi: 'NTT', kotkab: 'Kota Kupang', kecamatan: 'Alak', desa: 'Namosain' },
  { adm4: '61.71.02.1001', provinsi: 'Kalimantan Barat', kotkab: 'Kota Pontianak', kecamatan: 'Pontianak Timur', desa: 'Paritmayor' },
  { adm4: '62.71.01.1001', provinsi: 'Kalimantan Tengah', kotkab: 'Kota Palangkaraya', kecamatan: 'Pahandut', desa: 'Pahandut' },
  { adm4: '63.71.01.1001', provinsi: 'Kalimantan Selatan', kotkab: 'Kota Banjarmasin', kecamatan: 'Banjarmasin Selatan', desa: 'Mantuil' },
  { adm4: '64.71.01.1001', provinsi: 'Kalimantan Timur', kotkab: 'Kota Balikpapan', kecamatan: 'Balikpapan Timur', desa: 'Manggar' },
  { adm4: '64.72.01.1001', provinsi: 'Kalimantan Timur', kotkab: 'Kota Samarinda', kecamatan: 'Palaran', desa: 'Rawa Makmur' },
  { adm4: '65.71.01.1001', provinsi: 'Kalimantan Utara', kotkab: 'Kota Tarakan', kecamatan: 'Tarakan Barat', desa: 'Karang Anyar' },
  { adm4: '71.71.01.1001', provinsi: 'Sulawesi Utara', kotkab: 'Kota Manado', kecamatan: 'Bunaken', desa: 'Molas' },
  { adm4: '72.71.01.1006', provinsi: 'Sulawesi Tengah', kotkab: 'Kota Palu', kecamatan: 'Palu Timur', desa: 'Besusu Tengah' },
  { adm4: '73.71.01.1001', provinsi: 'Sulawesi Selatan', kotkab: 'Kota Makassar', kecamatan: 'Mariso', desa: 'Bontorannu' },
  { adm4: '74.71.03.1001', provinsi: 'Sulawesi Tenggara', kotkab: 'Kota Kendari', kecamatan: 'Baruga', desa: 'Baruga' },
  { adm4: '75.71.01.1001', provinsi: 'Gorontalo', kotkab: 'Kota Gorontalo', kecamatan: 'Kota Barat', desa: 'Dembe I' },
  { adm4: '76.01.02.1001', provinsi: 'Sulawesi Barat', kotkab: 'Pasangkayu', kecamatan: 'Pasangkayu', desa: 'Pasangkayu' },
  { adm4: '81.01.01.2001', provinsi: 'Maluku', kotkab: 'Maluku Tengah', kecamatan: 'Amahai', desa: 'Tamilouw' },
  { adm4: '82.71.01.1001', provinsi: 'Maluku Utara', kotkab: 'Kota Ternate', kecamatan: 'Pulau Ternate', desa: 'Jambula' },
  { adm4: '91.71.01.1001', provinsi: 'Papua', kotkab: 'Kota Jayapura', kecamatan: 'Jayapura Utara', desa: 'Gurabesi' },
  { adm4: '92.03.01.1001', provinsi: 'Papua Barat', kotkab: 'Fak Fak', kecamatan: 'Fak-Fak', desa: 'Fak Fak Selatan' },
  { adm4: '93.01.01.2001', provinsi: 'Papua Selatan', kotkab: 'Merauke', kecamatan: 'Merauke', desa: 'Nasem' },
  { adm4: '94.01.01.1001', provinsi: 'Papua Tengah', kotkab: 'Nabire', kecamatan: 'Nabire', desa: 'Wonorejo' },
  { adm4: '95.01.01.1001', provinsi: 'Papua Pegunungan', kotkab: 'Jayawijaya', kecamatan: 'Wamena', desa: 'Wamena Kota' },
  { adm4: '96.71.01.1001', provinsi: 'Papua Barat Daya', kotkab: 'Kota Sorong', kecamatan: 'Sorong', desa: 'Remu Utara' },
];

/** Cari lokasi kurasi: cocok case-insensitive pada provinsi/kotkab/kecamatan/desa/adm4. Maks 20 hasil. */
export function searchLocations(q: string, limit = 20): WeatherLocation[] {
  const needle = q.trim().toLowerCase();
  const max = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 20;
  if (!needle) return CURATED_LOCATIONS.slice(0, max);
  const out: WeatherLocation[] = [];
  for (const loc of CURATED_LOCATIONS) {
    const hay = `${loc.provinsi} ${loc.kotkab} ${loc.kecamatan} ${loc.desa} ${loc.adm4}`.toLowerCase();
    if (hay.includes(needle)) {
      out.push(loc);
      if (out.length >= max) break;
    }
  }
  return out;
}

/** Ambil lokasi kurasi berdasarkan kode adm4. */
export function getLocation(adm4: string): WeatherLocation | undefined {
  return CURATED_LOCATIONS.find((l) => l.adm4 === adm4);
}
