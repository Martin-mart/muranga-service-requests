import { useCallback, useState } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'success'; coords: Coordinates }
  | { status: 'error'; message: string };

const MESSAGES: Record<number, string> = {
  1: 'Location permission was denied. You can still describe the location in words.',
  2: 'Your location could not be determined. Try again outdoors or describe it in words.',
  3: 'Finding your location took too long. Please try again.',
};

/** Optional, user-initiated location capture (never requested on page load). */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'This device does not support location services.' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: 'success',
          coords: {
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy),
          },
        });
      },
      (error) => {
        setState({ status: 'error', message: MESSAGES[error.code] ?? 'Location is unavailable.' });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, []);

  const clear = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, locate, clear };
}
