export function toDisplayMediaUrl(url?: string | null) {
  if (!url) return '';

  if (url.startsWith('/api/uploads/file?key=')) return url;

  const toProxy = (key: string) => `/api/uploads/file?key=${encodeURIComponent(key)}`;

  try {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname.replace(/^\/+/, '');

    // direct uploads key
    if (cleanPath.startsWith('uploads/')) return toProxy(cleanPath);

    // bucket-prefixed path: <bucket>/uploads/...
    const marker = '/uploads/';
    const markerIndex = cleanPath.indexOf(marker);
    if (markerIndex !== -1) {
      const key = cleanPath.slice(markerIndex + 1); // uploads/...
      if (key.startsWith('uploads/')) return toProxy(key);
    }

    return url;
  } catch {
    if (url.startsWith('uploads/')) return toProxy(url);
    return url;
  }
}
