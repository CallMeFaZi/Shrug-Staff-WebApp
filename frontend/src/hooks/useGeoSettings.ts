import { useEffect, useState } from 'react';
import { settingsApi } from '../api/client';

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
        const settings = await settingsApi.get();
        if (Array.isArray(settings)) {
          const map: Record<string, string> = {};
          settings.forEach((s: any) => (map[s.key] = s.value));
          setGeo({
            geo_lat: map['geo_lat'] || '',
            geo_lng: map['geo_lng'] || '',
            geo_radius: map['geo_radius'] || '50',
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { geo, loading };
}