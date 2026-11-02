'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import type { Quake, Volcano } from '@/lib/api';
import { volcanoLevelColor } from '@/lib/api';
import { formatWaktu, magColor, magLabel } from '@/lib/geo';
import { IconArrowRight, IconReset, VolcanoMark } from './icons';
import { deep, tint } from './ui';

/**
 * Pilihan basemap — ganti `MAP_STYLE` untuk berpindah.
 * - 'google': tampilan Google Maps persis. PERHATIAN: ini URL tile tidak resmi. Tidak butuh API key,
 *   tetapi melanggar Ketentuan Layanan Google Maps Platform; bisa diblokir kapan saja dan tidak
 *   layak untuk produksi/komersial.
 * - 'esri': Esri World Street Map — gaya sangat mirip Google, tanpa key untuk pemakaian ringan.
 * - 'osm': OpenStreetMap standar — sepenuhnya diizinkan, gaya berbeda.
 */
type MapStyle = 'google' | 'esri' | 'osm';
const MAP_STYLE = 'google' as MapStyle;

const TILES: Record<
  MapStyle,
  { url: string; attribution: string; subdomains: string | string[]; maxZoom: number }
> = {
  google: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&hl=id&gl=ID&x={x}&y={y}&z={z}',
    attribution: 'Map data &copy; Google',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
};

export const INDONESIA_CENTER: [number, number] = [-2.5, 118];
export const INDONESIA_ZOOM = 5;

function FlyTo({ target }: { target: { lat: number; lon: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], target.zoom ?? 7, { duration: 1.4, easeLinearity: 0.2 });
  }, [target, map]);
  return null;
}

function ResetListener() {
  const map = useMap();
  useEffect(() => {
    const fn = () => map.flyTo(INDONESIA_CENTER, INDONESIA_ZOOM, { duration: 1.4, easeLinearity: 0.2 });
    window.addEventListener('map:reset-indonesia', fn);
    return () => window.removeEventListener('map:reset-indonesia', fn);
  }, [map]);
  return null;
}

/** Marker gunung api: segitiga berujung lembut dengan simbol puncak di bagian dalam. */
export function volcanoTriangleIcon(color: string, selected = false) {
  const width = selected ? 40 : 34;
  const height = selected ? 44 : 38;
  return L.divIcon({
    className: 'dm-vol-icon-shell',
    html:
      `<span class="dm-vol${selected ? ' is-selected' : ''}" style="--vol-color:${color}" role="img" aria-label="Marker gunung api">` +
      `<svg viewBox="0 0 40 44" width="${width}" height="${height}" aria-hidden="true" focusable="false">` +
      `<path d="M20 3.5c1.2 0 2.3.7 2.9 1.8l14.1 24.9c1.3 2.4-.4 5.2-3.1 5.2H6.1c-2.7 0-4.4-2.8-3.1-5.2L17.1 5.3c.6-1.1 1.7-1.8 2.9-1.8Z" fill="${color}" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="m12.6 25.3 4.7-8.1 2.8 4 2.2-2.8 5.1 6.9H12.6Z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M14.7 28.4h10.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" opacity=".9"/>` +
      `</svg></span>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
    popupAnchor: [0, -height / 2],
  });
}

/** Marker gempa berbentuk medali magnitudo: jelas pada peta, tetap ringan saat banyak titik. */
function quakeMarkerIcon(magnitude: number, color: string, selected = false) {
  const size = Math.round(Math.min(42, Math.max(32, 29 + magnitude * 1.45)) + (selected ? 4 : 0));
  const label = magnitude.toFixed(1);
  const major = magnitude >= 6;
  return L.divIcon({
    className: 'dm-quake-icon-shell',
    html:
      `<span class="dm-quake-marker${selected ? ' is-selected' : ''}" ` +
      `style="--quake-color:${color};--quake-size:${size}px" ` +
      `data-major="${major}" aria-label="Magnitudo ${label}">` +
      `<span class="dm-quake-marker__label">${label}</span>` +
      `</span>`,
    iconSize: [size + 18, size + 18],
    iconAnchor: [(size + 18) / 2, (size + 18) / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

const userIcon = () =>
  L.divIcon({
    className: '',
    html: '<div class="dm-user-dot"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

export default function MapView({
  quakes,
  selectedId,
  flyTarget,
  userLocation,
  onMarkerClick,
  volcanoes,
  selectedVolcanoSlug,
  onVolcanoClick,
}: {
  quakes: Quake[];
  selectedId?: number | string | null;
  flyTarget?: { lat: number; lon: number; zoom?: number } | null;
  userLocation?: { lat: number; lon: number } | null;
  onMarkerClick?: (q: Quake) => void;
  volcanoes?: Volcano[];
  selectedVolcanoSlug?: string | null;
  onVolcanoClick?: (v: Volcano) => void;
}) {
  return (
    <div
      data-testid="map-container"
      className="relative isolate h-full w-full overflow-hidden"
      role="application"
      aria-label="Peta sebaran gempa"
    >
      <MapContainer
        center={INDONESIA_CENTER}
        zoom={INDONESIA_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        zoomSnap={0.5}
        className="h-full w-full"
        style={{ minHeight: 300 }}
      >
        <TileLayer
          key={MAP_STYLE}
          attribution={TILES[MAP_STYLE].attribution}
          url={TILES[MAP_STYLE].url}
          subdomains={TILES[MAP_STYLE].subdomains}
          maxZoom={TILES[MAP_STYLE].maxZoom}
          detectRetina
        />
        <ZoomControl position="bottomright" />
        <FlyTo target={flyTarget ?? null} />
        <ResetListener />
        {quakes.map((q) => {
          const m = Number(q.magnitude) || 0;
          const selected = selectedId != null && String(selectedId) === String(q.id);
          const color = magColor(m);
          return (
            <Marker
              key={String(q.id)}
              position={[q.latitude, q.longitude]}
              icon={quakeMarkerIcon(m, color, selected)}
              zIndexOffset={selected ? 1200 : m >= 6 ? 500 : 0}
              eventHandlers={{ click: () => onMarkerClick?.(q) }}
            >
                <Popup>
                  <div className="min-w-[210px]">
                    <p className="flex items-center gap-2.5">
                      <span
                        className="inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-1.5 text-[15px] font-bold tabular-nums"
                        style={{ background: tint(color, 15), color: deep(color, 70) }}
                      >
                        {m.toFixed(1)}
                      </span>
                      <span className="text-[13px] text-[color:var(--ink-3)]">Kedalaman {q.depth_km} km</span>
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-snug text-[color:var(--ink)]">{q.location}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-[color:var(--ink-3)]">{formatWaktu(q.event_time)} WIB</p>
                    <Link href={`/gempa/${q.id}`} className="dm-link mt-2.5">
                      Lihat detail
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Popup>
            </Marker>
          );
        })}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon()}>
            <Popup>Lokasi Anda</Popup>
          </Marker>
        )}
        {(volcanoes ?? [])
          .filter((v) => v.latitude != null && v.longitude != null)
          .map((v) => {
            const color = volcanoLevelColor(v.level);
            const selected = selectedVolcanoSlug != null && selectedVolcanoSlug === v.slug;
            return (
              <Marker
                key={`volcano-${v.slug}`}
                position={[v.latitude as number, v.longitude as number]}
                icon={volcanoTriangleIcon(color, selected)}
                eventHandlers={{ click: () => onVolcanoClick?.(v) }}
              >
                <Popup>
                  <div className="min-w-[210px]">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">Gunung {v.name}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--ink-3)]">{v.province}</p>
                    <p className="mt-2">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ background: tint(color, 15), color: deep(color, 68) }}
                      >
                        Level {v.level} {v.level_name}
                      </span>
                    </p>
                    <Link href={`/gunung-api/${v.slug}`} className="dm-link mt-2.5">
                      Lihat detail
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Kontrol atas: kembali ke Indonesia */}
      <div className="absolute right-3 top-3 z-[500]">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('map:reset-indonesia'))}
          aria-label="Atur ulang tampilan ke Indonesia"
          title="Reset: Indonesia"
          className="dm-btn h-9 !px-2.5 shadow-[var(--shadow-lift)]"
        >
          <IconReset className="h-4 w-4" />
          <span className="hidden sm:inline">Indonesia</span>
        </button>
      </div>

      {/* Legenda: ringkas di mobile, penuh di desktop */}
      <div
        className="dm-float dm-glass absolute bottom-3 left-3 z-[500] max-w-[calc(100%-4.5rem)] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed text-[color:var(--ink-2)]"
        aria-label="Legenda peta"
      >
        <p className="font-semibold text-[color:var(--ink)]">Magnitudo</p>
        <div className="mt-1 flex flex-row gap-3.5 sm:flex-col sm:gap-1">
          {[
            { color: magColor(4), label: magLabel(4) },
            { color: magColor(5.2), label: magLabel(5.2) },
            { color: magColor(6.1), label: magLabel(6.1) },
          ].map((l) => (
            <p key={l.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                style={{ background: l.color }}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{l.label}</span>
            </p>
          ))}
        </div>
        {volcanoes != null && volcanoes.length > 0 && (
          <div className="mt-2 border-t border-[color:var(--line)] pt-2">
            <p className="font-semibold text-[color:var(--ink)]">Level gunung api</p>
            <div className="mt-1 flex flex-row flex-wrap gap-x-3.5 gap-y-1 sm:flex-col sm:gap-1">
              {[
                { level: 4, label: 'Awas' },
                { level: 3, label: 'Siaga' },
                { level: 2, label: 'Waspada' },
                { level: 1, label: 'Normal' },
              ].map((l) => (
                <p key={l.label} className="flex items-center gap-1.5">
                  <VolcanoMark color={volcanoLevelColor(l.level)} className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{l.label}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
