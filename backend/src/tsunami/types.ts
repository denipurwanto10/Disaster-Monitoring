/** Tipe data peristiwa tsunami BMKG InaTEWS (CAP feed last30tsunamievent.xml). */

export type TsunamiStatus = 'warning' | 'ended';

export interface TsunamiEvent {
  /** ID unik BMKG, format YYYYMMDDHHMMSS (waktu WIB), mis. "20260815073130". */
  event_id: string;
  /** Magnitudo gempa pemicu. */
  magnitude: number;
  /** Kedalaman (km); null bila tidak tersedia. */
  depth_km: number | null;
  /** Uraian wilayah episenter. */
  area: string;
  /** Lintang; null bila tidak dapat diparsing. */
  latitude: number | null;
  /** Bujur; null bila tidak dapat diparsing. */
  longitude: number | null;
  /** Waktu kejadian (ISO UTC). */
  event_time: string;
  /** 'warning' = peringatan aktif, 'ended' = headline/deskripsi memuat "berakhir". */
  status: TsunamiStatus;
  /** Level peringatan dari subject "Warning Tsunami PD-N", mis. "2"; null bila tidak ada. */
  warning_level: string | null;
  /** Isi tag <potential> (potensi tsunami menurut BMKG). */
  potential: string;
  headline: string;
  description: string;
  source: 'BMKG-InaTEWS';
}
