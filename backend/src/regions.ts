export interface Region {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
}

/** Daftar bawaan provinsi/kota Indonesia (nama, provinsi, lat, lon). */
export const REGIONS: Region[] = [
  { name: 'Jakarta', province: 'DKI Jakarta', latitude: -6.2088, longitude: 106.8456 },
  { name: 'Bandung', province: 'Jawa Barat', latitude: -6.9175, longitude: 107.6191 },
  { name: 'Semarang', province: 'Jawa Tengah', latitude: -6.9667, longitude: 110.4167 },
  { name: 'Yogyakarta', province: 'DI Yogyakarta', latitude: -7.7956, longitude: 110.3695 },
  { name: 'Surabaya', province: 'Jawa Timur', latitude: -7.2575, longitude: 112.7521 },
  { name: 'Serang', province: 'Banten', latitude: -6.1167, longitude: 106.15 },
  { name: 'Medan', province: 'Sumatera Utara', latitude: 3.5952, longitude: 98.6722 },
  { name: 'Banda Aceh', province: 'Aceh', latitude: 5.5483, longitude: 95.3238 },
  { name: 'Padang', province: 'Sumatera Barat', latitude: -0.9471, longitude: 100.4172 },
  { name: 'Pekanbaru', province: 'Riau', latitude: 0.5071, longitude: 101.4478 },
  { name: 'Jambi', province: 'Jambi', latitude: -1.6101, longitude: 103.6131 },
  { name: 'Palembang', province: 'Sumatera Selatan', latitude: -2.99, longitude: 104.7565 },
  { name: 'Bengkulu', province: 'Bengkulu', latitude: -3.7928, longitude: 102.2608 },
  { name: 'Bandar Lampung', province: 'Lampung', latitude: -5.4294, longitude: 105.2623 },
  { name: 'Pangkal Pinang', province: 'Kepulauan Bangka Belitung', latitude: -2.1316, longitude: 106.1164 },
  { name: 'Tanjung Pinang', province: 'Kepulauan Riau', latitude: 0.918, longitude: 104.45 },
  { name: 'Pontianak', province: 'Kalimantan Barat', latitude: -0.0263, longitude: 109.3425 },
  { name: 'Palangka Raya', province: 'Kalimantan Tengah', latitude: -2.2167, longitude: 113.9167 },
  { name: 'Banjarmasin', province: 'Kalimantan Selatan', latitude: -3.3194, longitude: 114.5908 },
  { name: 'Samarinda', province: 'Kalimantan Timur', latitude: 0.5017, longitude: 117.1249 },
  { name: 'Balikpapan', province: 'Kalimantan Timur', latitude: -1.2654, longitude: 116.8312 },
  { name: 'Tanjung Selor', province: 'Kalimantan Utara', latitude: 2.8304, longitude: 117.3813 },
  { name: 'Denpasar', province: 'Bali', latitude: -8.6705, longitude: 115.2126 },
  { name: 'Mataram', province: 'Nusa Tenggara Barat', latitude: -8.59, longitude: 116.115 },
  { name: 'Kupang', province: 'Nusa Tenggara Timur', latitude: -10.1718, longitude: 123.6075 },
  { name: 'Makassar', province: 'Sulawesi Selatan', latitude: -5.1477, longitude: 119.4327 },
  { name: 'Manado', province: 'Sulawesi Utara', latitude: 1.4748, longitude: 124.8421 },
  { name: 'Palu', province: 'Sulawesi Tengah', latitude: -0.8917, longitude: 119.8707 },
  { name: 'Kendari', province: 'Sulawesi Tenggara', latitude: -3.9985, longitude: 122.512 },
  { name: 'Mamuju', province: 'Sulawesi Barat', latitude: -2.6744, longitude: 118.8892 },
  { name: 'Gorontalo', province: 'Gorontalo', latitude: 0.5435, longitude: 123.0595 },
  { name: 'Ambon', province: 'Maluku', latitude: -3.6954, longitude: 128.1814 },
  { name: 'Ternate', province: 'Maluku Utara', latitude: 0.7883, longitude: 127.38 },
  { name: 'Jayapura', province: 'Papua', latitude: -2.5333, longitude: 140.7167 },
  { name: 'Manokwari', province: 'Papua Barat', latitude: -0.8615, longitude: 134.0648 },
  { name: 'Merauke', province: 'Papua Selatan', latitude: -8.5, longitude: 140.4 },
  { name: 'Wamena', province: 'Papua Pegunungan', latitude: -4.1018, longitude: 138.9516 },
];

/** Pencarian substring (case-insensitive) pada nama & provinsi. */
export function searchRegions(q: string, limit = 10): Region[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return REGIONS.filter(
    (r) => r.name.toLowerCase().includes(needle) || r.province.toLowerCase().includes(needle),
  ).slice(0, limit);
}
