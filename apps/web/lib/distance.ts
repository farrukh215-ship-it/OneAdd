const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  lahore: { lat: 31.5204, lng: 74.3587 },
  karachi: { lat: 24.8607, lng: 67.0011 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  faisalabad: { lat: 31.4504, lng: 73.135 },
  multan: { lat: 30.1575, lng: 71.5249 },
  peshawar: { lat: 34.0151, lng: 71.5249 },
  quetta: { lat: 30.1798, lng: 66.975 },
};

type Coordinate = { lat: number; lng: number };

function normalizeCity(city: string | undefined) {
  return (city || '').trim().toLowerCase();
}

function haversineKm(a: Coordinate, b: Coordinate) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
  return Math.round(radius * c);
}

export function distanceFromCity(
  referenceCity: string | undefined,
  listingCity: string | undefined,
  referenceCoords?: Coordinate,
) {
  const to = CITY_COORDS[normalizeCity(listingCity)];
  if (!to) return null;

  if (referenceCoords) return haversineKm(referenceCoords, to);

  const from = CITY_COORDS[normalizeCity(referenceCity)];
  if (!from) return null;
  return haversineKm(from, to);
}
