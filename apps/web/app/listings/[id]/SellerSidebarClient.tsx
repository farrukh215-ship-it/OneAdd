'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../lib/api';
import { distanceFromCity } from '../../../lib/distance';
import {
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  PhoneIcon,
  VerifiedIcon,
  WhatsAppIcon,
} from './DetailIcons';

function formatAbsolute(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(value?: string | null) {
  if (!value) return 'N/A';
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60_000) return 'Abhi active';
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

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="detail-stat">
      <div className="flex items-center gap-2 text-ink2">
        {icon}
        <span className="detail-stat-label">{label}</span>
      </div>
      <div className="detail-stat-value">{value}</div>
    </div>
  );
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
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
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
    const estimated = distanceFromCity(
      savedCity,
      sellerCity,
      undefined,
      typeof sellerLat === 'number' && typeof sellerLng === 'number'
        ? { lat: sellerLat, lng: sellerLng }
        : undefined,
    );
    if (estimated !== null) {
      setDistanceText(`${estimated} km city match se`);
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

  useEffect(() => {
    if (!currentUser) {
      setIsSaved(false);
      return;
    }

    let mounted = true;
    api
      .get<Array<{ id: string }>>('/listings/saved')
      .then((response) => {
        if (!mounted) return;
        setIsSaved(response.data.some((item) => item.id === listingId));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [currentUser, listingId]);

  const redirectToAuth = () => {
    window.location.href = `/auth?next=${encodeURIComponent(`/listings/${listingId}`)}`;
  };

  const fetchPhone = async () => {
    const response = await api.get<{ phone: string }>(`/listings/${listingId}/contact`);
    setPhone(response.data.phone);
    return response.data.phone;
  };

  const revealPhone = async () => {
    if (phone || isLoading) return;
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
      window.open(
        `https://wa.me/${normalizePhoneForWhatsapp(contactPhone)}`,
        '_blank',
        'noopener,noreferrer',
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const toggleSaved = async () => {
    if (isLoading || saveLoading) return;
    if (!currentUser) {
      redirectToAuth();
      return;
    }

    try {
      setSaveLoading(true);
      if (isSaved) {
        await api.delete(`/listings/${listingId}/save`);
        setIsSaved(false);
      } else {
        await api.post(`/listings/${listingId}/save`);
        setIsSaved(true);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const shareListing = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: sellerName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      // ignore cancelled share/copy failures
    }
  };

  return (
    <>
      <div className="space-y-4 lg:sticky lg:top-[86px]">
        <div className="surface-premium overflow-hidden p-5">
          <div className="rounded-[18px] border border-black/5 bg-[linear-gradient(135deg,_rgba(248,249,251,0.96),_rgba(255,255,255,0.96))] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F3F4F6] text-lg font-extrabold text-ink2 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-base font-extrabold text-ink">
                  <span className="truncate">{sellerName}</span>
                  {sellerVerified ? (
                    <span className="text-green">
                      <VerifiedIcon />
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="detail-chip">
                    <LocationIcon />
                    <span>{sellerLocation}</span>
                  </span>
                  {distanceText ? (
                    <span className="detail-chip bg-[rgba(46,125,50,0.09)] text-green">
                      <LocationIcon />
                      <span>{distanceText}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Joined" value={formatAbsolute(joinedAt)} icon={<CalendarIcon />} />
              <MiniStat label="Last online" value={formatRelative(sellerLastOnlineAt)} icon={<ClockIcon />} />
              <MiniStat label="Posted" value={formatAbsolute(listingCreatedAt)} icon={<CalendarIcon />} />
              <MiniStat label="Updated" value={formatRelative(listingUpdatedAt)} icon={<ClockIcon />} />
            </div>
          </div>
        </div>

        <div className="surface-premium p-5">
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink3">
            Contact seller
          </div>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={revealPhone}
              className="btn-red w-full rounded-2xl !py-3.5"
              disabled={loadingAction !== null}
            >
              <PhoneIcon />
              <span>
                {loadingAction === 'phone'
                  ? 'Number load ho raha hai...'
                  : phone || 'Phone Number Dekho'}
              </span>
            </button>
            <button
              type="button"
              onClick={openWhatsapp}
              className="btn-white w-full rounded-2xl !py-3.5"
              disabled={loadingAction !== null}
            >
              <WhatsAppIcon />
              <span>
                {loadingAction === 'whatsapp' ? 'WhatsApp khul raha hai...' : 'WhatsApp pe Message'}
              </span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleSaved}
                className="btn-white w-full rounded-2xl !py-2.5 text-sm"
                disabled={saveLoading || loadingAction !== null}
              >
                {saveLoading ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save Ad'}
              </button>
              <button
                type="button"
                onClick={shareListing}
                className="btn-white w-full rounded-2xl !py-2.5 text-sm"
              >
                {shareCopied ? 'Link Copied' : 'Share'}
              </button>
            </div>
            {!currentUser && !isLoading ? (
              <Link
                href={`/auth?next=${encodeURIComponent(`/listings/${listingId}`)}`}
                className="text-center text-xs font-semibold text-ink2"
              >
                Number dekhne ke liye login zaroori hai
              </Link>
            ) : null}
          </div>
        </div>

        <div className="surface-premium p-5">
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink3">
            Buyer Safety
          </div>
          <div className="space-y-2 text-xs text-ink2">
            <p>Deal se pehle product in-person check karein.</p>
            <p>Advance payment unknown seller ko na bhejein.</p>
            <p>Public jagah par meet-up prefer karein.</p>
          </div>
        </div>
      </div>

      <div className="mobile-safe-bottom fixed inset-x-0 bottom-14 z-40 border-t border-border bg-white/96 px-3 py-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-2">
          <button
            type="button"
            onClick={revealPhone}
            className="btn-red w-full !rounded-[16px] !py-3"
            disabled={loadingAction !== null}
          >
            <PhoneIcon />
            <span className="truncate text-xs">{phone || 'Phone'}</span>
          </button>
          <button
            type="button"
            onClick={openWhatsapp}
            className="btn-white w-full !rounded-[16px] !py-3"
            disabled={loadingAction !== null}
          >
            <WhatsAppIcon />
            <span className="truncate text-xs">WhatsApp</span>
          </button>
        </div>
      </div>
    </>
  );
}
