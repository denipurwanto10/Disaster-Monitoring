/** Tipe modul cuaca BMKG (prakiraan cuaca + peringatan dini nowcast). */

export interface WeatherLocation {
  adm4: string;
  provinsi: string;
  kotkab: string;
  kecamatan: string;
  desa: string;
  lon?: number;
  lat?: number;
  label?: string;
}

export interface ForecastSlot {
  datetime: string;
  local_datetime: string;
  t: number;
  hu: number;
  weather: number;
  weather_desc: string;
  weather_desc_en: string;
  ws: number;
  wd: string;
  tcc: number;
  tp: number;
  vs_text: string;
  image: string;
}

export interface ForecastDay {
  /** Tanggal lokal "YYYY-MM-DD" (dari local_datetime). */
  date: string;
  slots: ForecastSlot[];
}

export interface Forecast {
  location: WeatherLocation;
  days: ForecastDay[];
  analysis_date: string;
}

export type AlertSeverity = 'high' | 'medium' | 'low';

export interface WeatherAlert {
  /** guid RSS, atau link bila guid kosong. */
  id: string;
  title: string;
  province: string;
  /** Tautan detail CAP XML BMKG (link out saja, tidak di-fetch). */
  link: string;
  description: string;
  pub_date: string;
  severity: AlertSeverity;
}
