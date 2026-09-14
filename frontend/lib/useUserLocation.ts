'use client';

import { useCallback, useState } from 'react';

export interface UserLocation {
  lat: number;
  lon: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Peramban Anda tidak mendukung layanan lokasi.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Akses lokasi ditolak. Aktifkan izin lokasi di peramban untuk fitur jarak.');
        } else if (err.code === err.TIMEOUT) {
          setError('Permintaan lokasi kedaluwarsa. Coba lagi.');
        } else {
          setError('Lokasi tidak dapat ditentukan saat ini.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  return { location, error, loading, request };
}
