'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import type { Quake, Volcano } from '@/lib/api';
import { volcanoLevelColor } from '@/lib/api';
import { formatWaktu, magColor, magLabel } from '@/lib/geo';
import { IconReset } from './icons';

export const INDONESIA_CENTER: [number, number] = [-2.5, 118];
export const INDONESIA_ZOOM = 5;

function FlyTo({ target }: { target: { lat: number; lon: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], target.zoom ?? 7, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function ResetListener() {
  const map = useMap();
  useEffect(() => {
    const fn = () => map.flyTo(INDONESIA_CENTER, INDONESIA_ZOOM, { duration: 0.8 });
    window.addEventListener('map:reset-indonesia', fn);
    return () => window.removeEventListener('map:reset-indonesia', fn);
  }, [map]);
  return null;
}

export function volcanoTriangleIcon(color: string, selected = false) {
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: '',
    html:
      `<div title="Gunung api" style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;` +
      `font-size:${selected ? 26 : 22}px;line-height:1;color:${color};` +
      `text-shadow:0 0 0 #fff, -1px 0 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, 0 1px 0 #fff, 0 1px 5px rgb(15 23 42 / .5);` +
      `${selected ? 'outline:2px solid #fff;outline-offset:-2px;border-radius:6px;' : ''}">▲</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

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
    <div data-testid="map-container" className="relative h-full w-full" role="application" aria-label="Peta sebaran gempa">
      <MapContainer
        center={INDONESIA_CENTER}
        zoom={INDONESIA_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 300 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; Data: BMKG'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <FlyTo target={flyTarget ?? null} />
        <ResetListener />
        {quakes.map((q) => {
          const m = Number(q.magnitude) || 0;
          const selected = selectedId != null && String(selectedId) === String(q.id);
          return (
            <CircleMarker
              key={String(q.id)}
              center={[q.latitude, q.longitude]}
              radius={selected ? 13 : 5 + Math.min(m, 8)}
              pathOptions={{
                color: '#ffffff',
                fillColor: magColor(m),
                fillOpacity: selected ? 1 : 0.85,
                weight: selected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onMarkerClick?.(q) }}
            >
              <Popup>
                <div className="min-w-[200px] text-sm">
                  <p className="flex items-center gap-2 font-bold">
                    <span
                      className="inline-flex h-6 min-w-9 items-center justify-center rounded px-1 text-xs font-bold text-white"
                      style={{ background: magColor(m) }}
                    >
                      {m.toFixed(1)}
                    </span>
                    {q.depth_km} km
                  </p>
                  <p className="mt-1 font-medium text-slate-800">{q.location}</p>
                  <p className="text-xs text-slate-500">{formatWaktu(q.event_time)} WIB</p>
                  <Link
                    href={`/gempa/${q.id}`}
                    className="mt-1.5 inline-block rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Lihat detail
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={L.divIcon({
              className: '',
              html: '<div style="width:16px;height:16px;border-radius:9999px;background:#0f766e;border:3px solid #fff;box-shadow:0 1px 6px rgb(15 23 42 / .4)"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
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
                  <div className="min-w-[200px] text-sm">
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      <span aria-hidden="true" style={{ color }}>
                        ▲
                      </span>
                      {v.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{v.province}</p>
                    <p className="mt-1">
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                        style={{ background: color }}
                      >
                        {v.level_name}
                      </span>
                    </p>
                    <Link
                      href={`/gunung-api/${v.slug}`}
                      className="mt-1.5 inline-block rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Lihat detail
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
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-card transition-colors hover:bg-slate-50"
        >
          <IconReset className="h-4 w-4" />
          <span className="hidden sm:inline">Indonesia</span>
        </button>
      </div>

      {/* Legenda adaptif: ringkas di mobile, penuh di desktop */}
      <div
        className="absolute bottom-3 left-3 z-[500] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] leading-relaxed text-slate-700 shadow-card backdrop-blur"
        aria-label="Legenda peta"
      >
        <p className="font-bold text-slate-900">Magnitudo</p>
        <div className="mt-0.5 flex flex-row gap-3 sm:flex-col sm:gap-0.5">
          {[
            { color: magColor(4), label: magLabel(4) },
            { color: magColor(5.2), label: magLabel(5.2) },
            { color: magColor(6.1), label: magLabel(6.1) },
          ].map((l) => (
            <p key={l.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white"
                style={{ background: l.color }}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{l.label}</span>
            </p>
          ))}
        </div>
        {volcanoes != null && volcanoes.length > 0 && (
          <div className="mt-1.5 border-t border-slate-100 pt-1.5">
            <p className="font-bold text-slate-900">Level gunung api</p>
            <div className="mt-0.5 flex flex-row gap-3 sm:flex-col sm:gap-0.5">
              {[
                { level: 4, label: 'Awas' },
                { level: 3, label: 'Siaga' },
                { level: 2, label: 'Waspada' },
                { level: 1, label: 'Normal' },
              ].map((l) => (
                <p key={l.label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block shrink-0 text-[11px] leading-none"
                    style={{ color: volcanoLevelColor(l.level) }}
                    aria-hidden="true"
                  >
                    ▲
                  </span>
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
