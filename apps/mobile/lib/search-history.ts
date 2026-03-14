import { storage } from './storage';

const RECENT_SEARCHES_KEY = 'tgmg_recent_searches';

export function getRecentSearches() {
  const raw = storage.getString(RECENT_SEARCHES_KEY);
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string) {
  const normalized = term.trim();
  if (!normalized) return;

  const next = [normalized, ...getRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase())]
    .slice(0, 5);

  storage.set(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function clearRecentSearches() {
  storage.remove(RECENT_SEARCHES_KEY);
}
