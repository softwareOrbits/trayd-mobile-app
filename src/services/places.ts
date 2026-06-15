import { GOOGLE_MAPS_API_KEY } from '@env';

const BASE = 'https://maps.googleapis.com/maps/api/place';

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

export async function autocompleteAddress(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
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
  return ((json.predictions ?? []) as any[]).map(p => ({
    placeId: p.place_id,
    description: p.description,
  }));
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails> {
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
  return {
    address: r.formatted_address,
    eircode: postal?.long_name ?? null,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
  };
}
