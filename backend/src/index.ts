import http from 'http';
import { createApp, attachRealtime } from './app.js';
import { config } from './config.js';
import { primeStore, startSyncLoop } from './sync/service.js';
import { setVolcanoEmitter, startVolcanoLoop } from './volcano/sync.js';
import { primeTsunami, setTsunamiEmitter, startTsunamiLoop } from './tsunami/sync.js';
import { primeWeather, setWeatherEmitter, startWeatherLoop } from './weather/sync.js';

function volcanoIntervalMs(): number {
  const v = Number(process.env.VOLCANO_SYNC_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : 900000;
}

function weatherIntervalMs(): number {
  const v = Number(process.env.WEATHER_SYNC_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : 600000;
}

function tsunamiIntervalMs(): number {
  const v = Number(process.env.TSUNAMI_SYNC_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : 600000;
}

async function main(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  const io = attachRealtime(server);
  setVolcanoEmitter((event, payload) => io.emit(event, payload));
  setTsunamiEmitter((event, payload) => io.emit(event, payload));
  setWeatherEmitter((event, payload) => io.emit(event, payload));
  // Prime tidak boleh menggagalkan boot (BMKG/DB down tetap jalan).
  try {
    await primeStore();
  } catch (err) {
    console.error('Prime store gagal (tetap jalan):', (err as Error).message);
  }
  startSyncLoop(config.syncIntervalMs);
  startVolcanoLoop(volcanoIntervalMs());
  startTsunamiLoop(tsunamiIntervalMs());
  startWeatherLoop(weatherIntervalMs());
  try {
    await primeWeather();
  } catch (err) {
    console.error('Prime cuaca gagal (tetap jalan):', (err as Error).message);
  }
  try {
    await primeTsunami();
  } catch (err) {
    console.error('Prime tsunami gagal (tetap jalan):', (err as Error).message);
  }
  server.listen(config.port, () => {
    console.log(`Backend listening on :${config.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal saat boot:', err);
  process.exit(1);
});
