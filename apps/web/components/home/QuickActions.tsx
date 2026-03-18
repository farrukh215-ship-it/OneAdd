'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CITY_COORDS: Array<{ city: string; lat: number; lng: number }> = [
  { city: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { city: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { city: 'Islamabad', lat: 33.6844, lng: 73.0479 },
  { city: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { city: 'Faisalabad', lat: 31.4504, lng: 73.135 },
];

function haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
  return 6371 * c;
}

function nearestCity(lat: number, lng: number) {
  let nearest = CITY_COORDS[0]!;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const city of CITY_COORDS) {
    const distance = haversineDistanceKm({ lat, lng }, city);
    if (distance < minDistance) {
      nearest = city;
      minDistance = distance;
    }
  }

  return nearest.city;
}

export function QuickActions({ city = 'Lahore' }: { city?: string }) {
  const router = useRouter();
  const nearMeFallbackHref = `/listings?city=${encodeURIComponent(city)}`;

  const openNearMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      router.push(nearMeFallbackHref);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedCity = nearestCity(position.coords.latitude, position.coords.longitude);
        window.localStorage.setItem('tgmg_city', detectedCity);
        router.push(
          `/listings?city=${encodeURIComponent(detectedCity)}&lat=${position.coords.latitude}&lng=${position.coords.longitude}&radiusKm=10`,
        );
      },
      () => router.push(nearMeFallbackHref),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <section className="hide-scrollbar flex gap-2 overflow-x-auto px-2 py-3 md:px-5">
      <Link href="/post" className="chip shrink-0">
        + Ad Post Karo
      </Link>
      <Link href={`/listings?sort=newest&city=${encodeURIComponent(city)}`} className="chip shrink-0">
        Taaza Listings
      </Link>
      <button
        type="button"
        onClick={openNearMe}
        aria-label="Mere Paas listings kholo"
        className="chip shrink-0 cursor-pointer select-none transition hover:border-[#d8dde6] hover:text-ink"
      >
        Mere Paas
      </button>
      <Link href={`/listings?sort=price_desc&city=${encodeURIComponent(city)}`} className="chip shrink-0">
        Top Deals
      </Link>
      <Link href="/contact" className="chip shrink-0">
        Contact
      </Link>
    </section>
  );
}
