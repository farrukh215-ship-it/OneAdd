import { storage } from './storage';

const CACHE_PREFIX = 'tgmg_query_cache:';

type CacheEnvelope<T> = {
  value: T;
  savedAt: number;
};

function keyFor(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

export function readCachedQuery<T>(key: string, maxAgeMs = 1000 * 60 * 60) {
  const raw = storage.getString(keyFor(key));
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== 'number') return undefined;
    if (Date.now() - parsed.savedAt > maxAgeMs) return undefined;
    return parsed.value;
  } catch {
    return undefined;
  }
}

export function writeCachedQuery<T>(key: string, value: T) {
  const envelope: CacheEnvelope<T> = {
    value,
    savedAt: Date.now(),
  };
  storage.set(keyFor(key), JSON.stringify(envelope));
}

