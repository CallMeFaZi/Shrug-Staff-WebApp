import { useEffect, useState } from 'react';
import api from '../api/client';

interface GeoSettings {
  geo_lat: string;
  geo_lng: string;
  geo_radius: string;
}

export function useGeoSettings() {
  const [geo, setGeo] = useState<GeoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Use the public geo endpoint (no auth needed)
        const res = await api.get('/geo-settings').then(r => r.data);
        setGeo({
          geo_lat: res.geo_lat || '',
          geo_lng: res.geo_lng || '',
          geo_radius: res.geo_radius || '50',
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { geo, loading };
}