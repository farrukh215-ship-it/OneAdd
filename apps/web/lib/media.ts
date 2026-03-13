export function toDisplayMediaUrl(url?: string | null) {
  if (!url) {
    return '';
  }

  if (url.startsWith('/api/uploads/file?key=')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const key = parsed.pathname.replace(/^\/+/, '');
    if (!key.startsWith('uploads/')) {
      return url;
    }
    return `/api/uploads/file?key=${encodeURIComponent(key)}`;
  } catch {
    if (url.startsWith('uploads/')) {
      return `/api/uploads/file?key=${encodeURIComponent(url)}`;
    }
    return url;
  }
}
