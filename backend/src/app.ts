import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import { router } from './routes.js';
import { tsunamiRouter } from './tsunami/routes.js';
import { volcanoRouter } from './volcano/routes.js';
import { weatherRouter } from './weather/routes.js';
import { attachSocket } from './sync/service.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMITED' } },
    }),
  );
  app.use('/api', router);
  app.use('/api/volcanoes', volcanoRouter);
  app.use('/api/tsunami', tsunamiRouter);
  app.use('/api/weather', weatherRouter);
  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Endpoint tidak ditemukan.', code: 'NOT_FOUND' } });
  });
  app.use(errorHandler);
  return app;
}

/** Attach Socket.IO ke HTTP server. Dipakai index.ts. */
export function attachRealtime(httpServer: Parameters<Server['attach']>[0] | import('http').Server): Server {
  const io = new Server(httpServer as import('http').Server, {
    cors: { origin: config.corsOrigin },
  });
  attachSocket(io);
  return io;
}
