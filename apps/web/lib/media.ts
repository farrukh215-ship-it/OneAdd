export function toDisplayMediaUrl(url?: string | null) {
  if (!url) return '';

  if (url.startsWith('/api/uploads/file?key=')) return url;

  const toProxy = (key: string) => `/api/uploads/file?key=${encodeURIComponent(key)}`;

  try {
    const parsed = new URL(url);
    // Public absolute URLs should stay absolute. They are already browser-ready.
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
    return url;
  } catch {
    if (url.startsWith('uploads/')) return toProxy(url);
    return url;
  }
}
