import type { Listing } from '@tgmg/types';

type RecommendationSignals = {
  preferredCity?: string;
  recentSearches?: string[];
  viewedCategorySlugs?: string[];
  viewedListingIds?: string[];
  nearbyListingIds?: string[];
};

function tokenizeSearches(searches: string[]) {
  return searches
    .flatMap((term) => term.toLowerCase().split(/\s+/))
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function textForListing(listing: Listing) {
  return [listing.title, listing.description, listing.category?.name, listing.city, listing.area]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function scoreListing(listing: Listing, signals: RecommendationSignals) {
  let score = 0;

  if (signals.preferredCity && listing.city?.toLowerCase() === signals.preferredCity.toLowerCase()) {
    score += 28;
  }

  if (listing.isNearby) {
    score += 24;
  }

  if (listing.isFeatured) {
    score += 14;
  }

  const categoryRank = signals.viewedCategorySlugs?.indexOf(listing.category?.slug ?? '') ?? -1;
  if (categoryRank >= 0) {
    score += Math.max(22 - categoryRank * 4, 6);
  }

  const viewedRank = signals.viewedListingIds?.indexOf(listing.id) ?? -1;
  if (viewedRank >= 0) {
    score -= Math.max(12 - viewedRank * 2, 4);
  }

  const nearbyRank = signals.nearbyListingIds?.indexOf(listing.id) ?? -1;
  if (nearbyRank >= 0) {
    score += Math.max(18 - nearbyRank * 3, 5);
  }

  const text = textForListing(listing);
  const searchTokens = tokenizeSearches(signals.recentSearches ?? []);
  for (const token of searchTokens) {
    if (text.includes(token)) {
      score += 6;
    }
  }

  const ageHours = Math.max(
    1,
    (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60),
  );
  score += Math.max(12 - ageHours / 12, 0);

  return Math.round(score * 100) / 100;
}

export function buildRecommendedFeed(listings: Listing[], signals: RecommendationSignals) {
  const deduped = Array.from(new Map(listings.map((item) => [item.id, item])).values());

  return deduped
    .map((listing) => ({ listing, score: scoreListing(listing, signals) }))
    .sort((left, right) => right.score - left.score || right.listing.createdAt.localeCompare(left.listing.createdAt))
    .map((item) => item.listing);
}

