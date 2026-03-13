'use client';

import type { Listing } from '@tgmg/types';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WideCard } from '../../components/listings/WideCard';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSaved = searchParams.get('saved') === '1';
  const [tab, setTab] = useState<'my' | 'saved'>(initialSaved ? 'saved' : 'my');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/auth?next=/profile');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;
    Promise.all([api.get<Listing[]>('/listings/my'), api.get<Listing[]>('/listings/saved')])
      .then(([myResponse, savedResponse]) => {
        if (!mounted) return;
        const myData = Array.isArray(myResponse.data)
          ? myResponse.data
          : (myResponse.data as unknown as { data?: Listing[] }).data ?? [];
        const savedData = Array.isArray(savedResponse.data)
          ? savedResponse.data
          : (savedResponse.data as unknown as { data?: Listing[] }).data ?? [];
        setMyListings(myData);
        setSavedListings(savedData);
      })
      .catch(() => {
        if (!mounted) return;
        setMyListings([]);
        setSavedListings([]);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  return (
    <div className="page-wrap px-2 py-4 md:px-5">
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
            <div className="flex flex-wrap gap-2">
              {tab === 'my' ? (
                <>
                  <button type="button" className="btn-white">Edit</button>
                  <button type="button" className="btn-white">Mark as Sold</button>
                  <button type="button" className="btn-white">Delete</button>
                </>
              ) : (
                <button type="button" className="btn-white">Unsave</button>
              )}
            </div>
          </div>
        ))}
        {((tab === 'my' ? myListings : savedListings).length === 0) ? (
          <div className="surface p-4 text-sm text-ink2">
            {tab === 'my' ? 'Aap ki original ads abhi yahan show hongi.' : 'Saved original ads abhi yahan show hongi.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
