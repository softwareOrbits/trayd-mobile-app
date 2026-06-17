import { GOOGLE_MAPS_API_KEY } from '@env';

const BASE = 'https://maps.googleapis.com/maps/api/place';
const STATIC_MAP = 'https://maps.googleapis.com/maps/api/staticmap';

/**
 * A Google Static Maps image URL with a pin per location (place-name strings
 * are geocoded by the API). The map auto-fits to include every marker. Returns
 * null when there are no locations. Render straight into an <Image>.
 */
export function staticMapUrl(
  locations: string[],
  opts?: { width?: number; height?: number },
): string | null {
  const places = locations.map(l => l.trim()).filter(Boolean);
  if (!places.length) return null;
  const width = opts?.width ?? 640;
  const height = opts?.height ?? 320;
  const base = `${STATIC_MAP}?size=${width}x${height}&scale=2&maptype=roadmap&key=${GOOGLE_MAPS_API_KEY}`;
  const markers = places
    .map(
      (loc, i) =>
        `markers=${encodeURIComponent(`color:${i === 0 ? 'red' : 'blue'}|${loc}`)}`,
    )
    .join('&');
  return `${base}&${markers}`;
}

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

export type PlaceDetails = {
  address: string;
  eircode: string | null;
  lat: number;
  lng: number;
};
export const newSessionToken = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });

/**
 * Tiny in-memory LRU-ish cache: avoids re-fetching the same query/place within
 * a session (the user backspacing and retyping a prefix is the common case).
 * Bounded so it can't grow without limit; cleared on app restart.
 */
const makeCache = <T>(max = 100) => {
  const map = new Map<string, T>();
  return {
    get: (k: string) => map.get(k),
    set: (k: string, v: T) => {
      if (map.size >= max) map.delete(map.keys().next().value as string);
      map.set(k, v);
    },
  };
};

const suggestionCache = makeCache<PlaceSuggestion[]>();
const detailsCache = makeCache<PlaceDetails>();

/** Synchronous cache peek — lets callers skip the spinner on a hit. */
export function peekAddressSuggestions(
  input: string,
): PlaceSuggestion[] | undefined {
  return suggestionCache.get(input.trim().toLowerCase());
}

export async function autocompleteAddress(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  const key = input.trim().toLowerCase();
  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    input,
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: sessionToken,
    components: 'country:ie',
  });
  const res = await fetch(`${BASE}/autocomplete/json?${params}`);
  const json = await res.json();
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(json.error_message ?? `Places error: ${json.status}`);
  }
  const out = ((json.predictions ?? []) as any[]).map(p => ({
    placeId: p.place_id,
    description: p.description,
  }));
  suggestionCache.set(key, out);
  return out;
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails> {
  // Details for a place id are stable, so the session token isn't part of the key.
  const cached = detailsCache.get(placeId);
  if (cached) return cached;

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: sessionToken,
    fields: 'formatted_address,geometry/location,address_components',
  });
  const res = await fetch(`${BASE}/details/json?${params}`);
  const json = await res.json();
  if (json.status !== 'OK') {
    throw new Error(json.error_message ?? `Places error: ${json.status}`);
  }
  const r = json.result;
  const postal = (r.address_components ?? []).find((c: any) =>
    (c.types ?? []).includes('postal_code'),
  );
  const out: PlaceDetails = {
    address: r.formatted_address,
    eircode: postal?.long_name ?? null,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
  };
  detailsCache.set(placeId, out);
  return out;
}
