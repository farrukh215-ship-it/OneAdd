'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../lib/api';
import { distanceFromCity } from '../../../lib/distance';

function formatAbsolute(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(value?: string | null) {
  if (!value) return 'N/A';
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60_000) return 'abhi abhi';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min pehle`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ghante pehle`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} din pehle`;
  return formatAbsolute(value);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizePhoneForWhatsapp(phone: string) {
  return phone.replace(/[^\d]/g, '');
}

export function SellerSidebarClient({
  listingId,
  sellerName,
  sellerVerified,
  sellerLocation,
  joinedAt,
  sellerLastOnlineAt,
  listingCreatedAt,
  listingUpdatedAt,
  sellerCity,
  sellerLat,
  sellerLng,
}: {
  listingId: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerLocation: string;
  joinedAt?: string | null;
  sellerLastOnlineAt?: string | null;
  listingCreatedAt: string;
  listingUpdatedAt: string;
  sellerCity?: string;
  sellerLat?: number;
  sellerLng?: number;
}) {
  const { currentUser, isLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [loadingAction, setLoadingAction] = useState<'phone' | 'whatsapp' | null>(null);
  const [distanceText, setDistanceText] = useState<string>('');

  const initials = useMemo(
    () =>
      sellerName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [sellerName],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedCity = window.localStorage.getItem('tgmg_city') || undefined;
    const estimated = distanceFromCity(savedCity, sellerCity, undefined, 
      typeof sellerLat === 'number' && typeof sellerLng === 'number'
        ? { lat: sellerLat, lng: sellerLng }
        : undefined,
    );
    if (estimated !== null) {
      setDistanceText(`${estimated} km aap ke city reference se`);
    }

    if (!navigator.geolocation || typeof sellerLat !== 'number' || typeof sellerLng !== 'number') {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const kms = haversineKm(
          position.coords.latitude,
          position.coords.longitude,
          sellerLat,
          sellerLng,
        );
        setDistanceText(`${kms} km aap ki location se`);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [sellerCity, sellerLat, sellerLng]);

  const redirectToAuth = () => {
    window.location.href = `/auth?next=${encodeURIComponent(`/listings/${listingId}`)}`;
  };

  const fetchPhone = async () => {
    const response = await api.get<{ phone: string }>(`/listings/${listingId}/contact`);
    setPhone(response.data.phone);
    return response.data.phone;
  };

  const revealPhone = async () => {
    if (phone) return;
    if (isLoading) return;
    if (!currentUser) {
      redirectToAuth();
      return;
    }

    try {
      setLoadingAction('phone');
      await fetchPhone();
    } finally {
      setLoadingAction(null);
    }
  };

  const openWhatsapp = async () => {
    if (isLoading) return;
    if (!currentUser) {
      redirectToAuth();
      return;
    }

    try {
      setLoadingAction('whatsapp');
      const contactPhone = phone || (await fetchPhone());
      window.open(`https://wa.me/${normalizePhoneForWhatsapp(contactPhone)}`, '_blank', 'noopener,noreferrer');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <div className="surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] font-bold text-ink2">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              {sellerName}
              {sellerVerified ? <span className="text-green">✓</span> : null}
            </div>
            <div className="text-xs text-ink2">{sellerLocation}</div>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-xs text-ink2">
          <div>Joined: {formatAbsolute(joinedAt)}</div>
          <div>Ad posted: {formatAbsolute(listingCreatedAt)}</div>
          <div>Ad updated: {formatRelative(listingUpdatedAt)}</div>
          <div>Last online: {formatRelative(sellerLastOnlineAt)}</div>
          {distanceText ? <div>Distance: {distanceText}</div> : null}
        </div>
        <div className="mt-2 text-sm font-semibold text-green">Dealer nahi - asli malik</div>
      </div>

      <div className="surface p-4">
        <div className="grid gap-3">
          <button
            type="button"
            onClick={revealPhone}
            className="btn-red"
            disabled={loadingAction !== null}
          >
            {loadingAction === 'phone'
              ? 'Number load ho raha hai...'
              : phone || 'Phone Number Dekho'}
          </button>
          <button
            type="button"
            onClick={openWhatsapp}
            className="btn-white"
            disabled={loadingAction !== null}
          >
            {loadingAction === 'whatsapp' ? 'WhatsApp khul raha hai...' : 'WhatsApp pe Message'}
          </button>
          {!currentUser && !isLoading ? (
            <Link href={`/auth?next=${encodeURIComponent(`/listings/${listingId}`)}`} className="text-center text-xs font-semibold text-ink3">
              Number dekhne ke liye login zaroori hai
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
