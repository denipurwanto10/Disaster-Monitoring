import dotenv from 'dotenv';

dotenv.config();

function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const config = {
  port: num('PORT', 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  syncIntervalMs: num('SYNC_INTERVAL_MS', 60000),
  bmkg: {
    autogempa:
      process.env.BMKG_AUTOGEMPA_URL ?? 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
    terkini: process.env.BMKG_TERKINI_URL ?? 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
    dirasakan:
      process.env.BMKG_DIRASAKAN_URL ?? 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json',
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: num('DB_PORT', 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'disaster_monitoring',
  },
  isProd: process.env.NODE_ENV === 'production',
};
