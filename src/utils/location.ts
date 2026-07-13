import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

export type GpsPoint = { lat: number; lng: number };

const readPosition = (highAccuracy: boolean) =>
  new Promise<GpsPoint | null>(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      {
        enableHighAccuracy: highAccuracy,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  });

/**
 * Shows the OS location prompt. On iOS this is the only call that surfaces it —
 * `getCurrentPosition` alone stays silent, and the prompt never appears at all
 * unless NSLocationWhenInUseUsageDescription is a non-empty string.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ).catch(() => PermissionsAndroid.RESULTS.DENIED);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return new Promise<boolean>(resolve => {
    try {
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false),
      );
    } catch {
      resolve(false);
    }
  });
}

/**
 * One-shot current position. Resolves null (never rejects) when permission
 * is denied or no fix is available, so callers can degrade gracefully.
 * Tries GPS first, then falls back to network location (more reliable on
 * emulators and indoors).
 */
export async function getCurrentPosition(): Promise<GpsPoint | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;
  const precise = await readPosition(true);
  if (precise) return precise;
  return readPosition(false);
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMeters(a: GpsPoint, b: GpsPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
