import type { ErrorRequestHandler } from 'express';
import { ValidationError } from '../utils/validate.js';
import { config } from '../config.js';

/** Error handler terpusat: { error: { message (Indonesia), code } }. Tanpa stack di production. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isValidation = err instanceof ValidationError;
  const status = (err as { status?: number }).status ?? (isValidation ? 400 : 500);
  const code = (err as { code?: string }).code ?? (isValidation ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
  let message: string;
  if (isValidation || (status >= 400 && status < 500 && typeof err.message === 'string' && err.message)) {
    message = err.message;
  } else if (status === 502 && typeof err.message === 'string' && err.message) {
    // Gagal hulu (BMKG/MAGMA): teruskan pesan ramah, bukan pesan server generik.
    message = err.message;
  } else if (status >= 500) {
    message = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
  } else {
    message = 'Permintaan tidak valid.';
  }
  const body: Record<string, unknown> = { error: { message, code } };
  if (!config.isProd && err instanceof Error && err.stack) {
    (body.error as Record<string, unknown>).detail = err.stack.split('\n').slice(0, 3).join('\n');
  }
  res.status(status).json(body);
};
