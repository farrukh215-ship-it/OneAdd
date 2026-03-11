'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WideCard } from '../../components/listings/WideCard';
import { useAuth } from '../../hooks/useAuth';
import { fallbackListings } from '../../lib/fallback-data';

export function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSaved = searchParams.get('saved') === '1';
  const [tab, setTab] = useState<'my' | 'saved'>(initialSaved ? 'saved' : 'my');
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/auth?next=/profile');
    }
  }, [currentUser, isLoading, router]);

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
        {(tab === 'my' ? fallbackListings.slice(0, 3) : fallbackListings.slice(3, 6)).map((listing) => (
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
      </div>
    </div>
  );
}
