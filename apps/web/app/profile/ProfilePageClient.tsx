'use client';

import type { Listing, ListingDashboard } from '@tgmg/types';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WideCard } from '../../components/listings/WideCard';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

type EditableListing = Listing & {
  draftTitle?: string;
  draftPrice?: string;
  draftDescription?: string;
};

export function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSaved = searchParams.get('saved') === '1';
  const [tab, setTab] = useState<'my' | 'saved'>(initialSaved ? 'saved' : 'my');
  const [myListings, setMyListings] = useState<EditableListing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [dashboard, setDashboard] = useState<ListingDashboard | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/auth?next=/profile');
    }
  }, [currentUser, isLoading, router]);

  const loadProfileData = async () => {
    const [myResponse, savedResponse, dashboardResponse] = await Promise.allSettled([
      api.get<{ data?: Listing[] } | Listing[]>('/listings/my'),
      api.get<{ data?: Listing[] } | Listing[]>('/listings/saved'),
      api.get<ListingDashboard>('/listings/my/dashboard'),
    ]);

    const myData =
      myResponse.status === 'fulfilled'
        ? Array.isArray(myResponse.value.data)
          ? myResponse.value.data
          : (myResponse.value.data as { data?: Listing[] }).data ?? []
        : [];
    const savedData =
      savedResponse.status === 'fulfilled'
        ? Array.isArray(savedResponse.value.data)
          ? savedResponse.value.data
          : (savedResponse.value.data as { data?: Listing[] }).data ?? []
        : [];

    setMyListings(
      myData.map((listing) => ({
        ...listing,
        draftTitle: listing.title,
        draftPrice: String(listing.price),
        draftDescription: listing.description,
      })),
    );
    setSavedListings(savedData);
    setDashboard(dashboardResponse.status === 'fulfilled' ? dashboardResponse.value.data : null);
  };

  useEffect(() => {
    if (!currentUser) return;
    loadProfileData().catch(() => {
      setMyListings([]);
      setSavedListings([]);
      setDashboard(null);
    });
  }, [currentUser]);

  const maxPoint = useMemo(() => {
    if (!dashboard?.points.length) return 1;
    return Math.max(...dashboard.points.map((point) => Math.max(point.contacts, point.listings)), 1);
  }, [dashboard?.points]);

  const updateDraft = (listingId: string, patch: Partial<EditableListing>) => {
    setMyListings((current) =>
      current.map((listing) => (listing.id === listingId ? { ...listing, ...patch } : listing)),
    );
  };

  const saveListing = async (listing: EditableListing) => {
    await api.patch(`/listings/${listing.id}`, {
      title: listing.draftTitle,
      price: Number(listing.draftPrice),
      description: listing.draftDescription,
    });
    setEditingId(null);
    await loadProfileData();
  };

  const setListingStatus = async (listingId: string, status: Listing['status']) => {
    await api.patch(`/listings/${listingId}`, { status });
    await loadProfileData();
  };

  return (
    <div className="page-wrap px-2 py-4 md:px-5">
      {dashboard ? (
        <div className="surface mb-5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-ink">Seller Dashboard</div>
              <div className="text-sm text-ink2">Views, contacts, aur listing performance ek jagah.</div>
            </div>
            <button type="button" className="btn-red">Boost Karo</button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="detail-stat"><div className="detail-stat-label">Views</div><div className="detail-stat-value">{dashboard.totalViews}</div></div>
            <div className="detail-stat"><div className="detail-stat-label">Contacts</div><div className="detail-stat-value">{dashboard.totalContacts}</div></div>
            <div className="detail-stat"><div className="detail-stat-label">Active</div><div className="detail-stat-value">{dashboard.activeListings}</div></div>
            <div className="detail-stat"><div className="detail-stat-label">Sold / Inactive</div><div className="detail-stat-value">{dashboard.soldListings} / {dashboard.inactiveListings}</div></div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {dashboard.points.map((point) => (
              <div key={point.label} className="rounded-2xl bg-[#F8F9FB] p-2 text-center">
                <div className="flex h-28 items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-full bg-red/80"
                    style={{ height: `${Math.max(12, (point.contacts / maxPoint) * 90)}px` }}
                  />
                  <div
                    className="w-3 rounded-full bg-[#1F2937]/75"
                    style={{ height: `${Math.max(12, (point.listings / maxPoint) * 90)}px` }}
                  />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-ink2">{point.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab('my')} className={`chip ${tab === 'my' ? 'active' : ''}`}>
          My Ads
        </button>
        <button type="button" onClick={() => setTab('saved')} className={`chip ${tab === 'saved' ? 'active' : ''}`}>
          Saved Ads
        </button>
      </div>

      <div className="space-y-3">
        {(tab === 'my' ? myListings : savedListings).map((listing) => (
          <div key={`${tab}-${listing.id}`} className="space-y-2">
            <WideCard listing={listing} />

            {tab === 'my' ? (
              <div className="surface p-3">
                {editingId === listing.id ? (
                  <div className="grid gap-2">
                    <input
                      value={(listing as EditableListing).draftTitle || ''}
                      onChange={(event) => updateDraft(listing.id, { draftTitle: event.target.value })}
                      className="field-input"
                    />
                    <input
                      value={(listing as EditableListing).draftPrice || ''}
                      onChange={(event) => updateDraft(listing.id, { draftPrice: event.target.value.replace(/\D/g, '') })}
                      className="field-input"
                    />
                    <textarea
                      value={(listing as EditableListing).draftDescription || ''}
                      onChange={(event) => updateDraft(listing.id, { draftDescription: event.target.value })}
                      className="field-input min-h-[110px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-red" onClick={() => saveListing(listing as EditableListing)}>
                        Save Changes
                      </button>
                      <button type="button" className="btn-white" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-white" onClick={() => setEditingId(listing.id)}>
                      Inline Edit
                    </button>
                    <button type="button" className="btn-white" onClick={() => setListingStatus(listing.id, 'PENDING')}>
                      Pending
                    </button>
                    <button type="button" className="btn-white" onClick={() => setListingStatus(listing.id, 'SOLD')}>
                      Mark Sold
                    </button>
                    <button type="button" className="btn-white" onClick={() => setListingStatus(listing.id, 'INACTIVE')}>
                      Deactivate
                    </button>
                    <button type="button" className="btn-white" onClick={() => setListingStatus(listing.id, 'ACTIVE')}>
                      Reactivate
                    </button>
                    <button
                      type="button"
                      className="btn-white"
                      onClick={() => api.patch(`/listings/${listing.id}`, { isFeatured: !listing.isFeatured }).then(loadProfileData)}
                    >
                      {listing.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-white" onClick={() => api.delete(`/listings/${listing.id}/save`).then(loadProfileData)}>
                  Unsave
                </button>
              </div>
            )}
          </div>
        ))}

        {(tab === 'my' ? myListings : savedListings).length === 0 ? (
          <div className="surface p-4 text-sm text-ink2">
            {tab === 'my' ? 'Aap ki ads yahan show hongi.' : 'Saved ads yahan show hongi.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
