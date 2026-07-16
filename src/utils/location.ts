import Geolocation from '@react-native-community/geolocation';

import { ensurePermission, requestPermission } from './permissions';

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
 * Shows the OS location prompt. Silent if the user already answered — use
 * `ensureLocationPermission` when a denial should send them to Settings.
 */
export async function requestLocationPermission(): Promise<boolean> {
  return (await requestPermission('location')) === 'granted';
}

/**
 * Same, but a permanently-denied permission surfaces a Settings alert instead
 * of quietly resolving false.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  return ensurePermission('location');
}

/**
 * One-shot current position. Resolves null (never rejects) when permission
 * is denied or no fix is available, so callers can degrade gracefully.
 * Tries GPS first, then falls back to network location (more reliable on
 * emulators and indoors).
 */
export async function getCurrentPosition(): Promise<GpsPoint | null> {
  const granted = await ensurePermission('location');
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
