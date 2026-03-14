import type { Listing } from '@tgmg/types';

export function getListingStatusMeta(listing: Pick<Listing, 'status' | 'isFeatured'>) {
  if (listing.isFeatured) {
    return {
      label: 'Featured',
      badgeClassName: 'bg-amber-500',
      textClassName: 'text-white',
    };
  }

  switch (listing.status) {
    case 'PENDING':
      return {
        label: 'Pending',
        badgeClassName: 'bg-amber-100',
        textClassName: 'text-amber-700',
      };
    case 'SOLD':
      return {
        label: 'Sold',
        badgeClassName: 'bg-red/10',
        textClassName: 'text-red',
      };
    case 'INACTIVE':
    case 'DELETED':
      return {
        label: 'Inactive',
        badgeClassName: 'bg-[#F1F3F5]',
        textClassName: 'text-ink2',
      };
    case 'ACTIVE':
    default:
      return {
        label: 'Available',
        badgeClassName: 'bg-green',
        textClassName: 'text-white',
      };
  }
}

export function getListingLocationLabel(listing: Pick<Listing, 'city' | 'area'>) {
  return [listing.city, listing.area].filter(Boolean).join(', ');
}
