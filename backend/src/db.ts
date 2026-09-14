import mysql, { type Pool } from 'mysql2/promise';
import { config } from './config.js';

let pool: Pool | null = null;
let unreachable = false;

/** Kembalikan pool MySQL, atau null bila DB tidak dapat dijangkau. Tidak pernah melempar. */
export async function getPool(): Promise<Pool | null> {
  if (pool) return pool;
  if (unreachable && process.env.DB_DISABLED !== '1') {
    // Coba ulang sesekali saja; pemanggil sync memanggil tiap interval sehingga retry alami terjadi.
  }
  try {
    const p = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 3000,
      // DATETIME dibaca sebagai string verbatim agar nilai UTC hasil
      // normalisasi tidak bergeser oleh timezone server MySQL/Node.
      dateStrings: ['DATETIME'],
    });
    const conn = await p.getConnection();
    conn.release();
    pool = p;
    unreachable = false;
    return pool;
  } catch {
    unreachable = true;
    try {
      // Hindari kebocoran pool setengah jadi.
      // (createPool tidak membuka koneksi sampai dipakai, aman diabaikan.)
    } catch {
      /* abaikan */
    }
    return null;
  }
}

/** Reset status koneksi (untuk pengujian). */
export function resetPool(): void {
  pool = null;
  unreachable = false;
}

/** True bila DB sedang dianggap tidak dapat dijangkau. */
export function isDbUnreachable(): boolean {
  return unreachable || process.env.DB_DISABLED === '1';
}
