import { useState, useCallback } from 'react';

interface GeoPosition {
  lat: number;
  lng: number;
}

interface GeoCheckResult {
  allowed: boolean;
  distance: number | null;
  error: string | null;
}

/**
 * Calculate distance between two GPS coordinates in meters
 * (Haversine formula)
 */
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation() {
  const [checking, setChecking] = useState(false);
  const [lastResult, setLastResult] = useState<GeoCheckResult | null>(null);

  const checkLocation = useCallback(
    async (targetLat: number, targetLng: number, maxRadiusMeters: number): Promise<GeoCheckResult> => {
      setChecking(true);
      setLastResult(null);

      // If no geo configured, skip check
      if (!targetLat && !targetLng) {
        const result: GeoCheckResult = { allowed: true, distance: null, error: null };
        setLastResult(result);
        setChecking(false);
        return result;
      }

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          });
        });

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const distance = getDistanceMeters(userLat, userLng, targetLat, targetLng);
        const allowed = distance <= maxRadiusMeters;

        const result: GeoCheckResult = {
          allowed,
          distance: Math.round(distance),
          error: allowed
            ? null
            : `You are ${Math.round(distance)}m away. Must be within ${maxRadiusMeters}m of the counter.`,
        };

        setLastResult(result);
        setChecking(false);
        return result;
      } catch (err: any) {
        const result: GeoCheckResult = {
          allowed: false,
          distance: null,
          error: err.code === 1 ? 'Location access denied. Please enable GPS.' : 'Unable to get location.',
        };
        setLastResult(result);
        setChecking(false);
        return result;
      }
    },
    []
  );

  return { checkLocation, checking, lastResult };
}