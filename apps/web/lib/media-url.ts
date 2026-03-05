const LEGACY_MEDIA_HOSTS = new Set([
  "zaroratbazar.shop",
  "www.zaroratbazar.shop",
  "api",
  "localhost"
]);

const FALLBACK_ORIGIN = "https://www.teragharmeraghar.com";

function resolveOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

function buildMediaPathFromFilename(raw: string) {
  const match = raw.match(/\/(?:api\/)?media\/files\/([^/?#]+)/i);
  if (!match?.[1]) {
    return "";
  }
  return `/api/media/files/${match[1]}`;
}

export function resolveMediaUrl(rawUrl: string) {
  const trimmed = rawUrl?.trim?.() ?? "";
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const origin = resolveOrigin();
  const pathFromFilename = buildMediaPathFromFilename(trimmed);
  if (pathFromFilename) {
    return `${origin}${pathFromFilename}`;
  }

  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const parsedPathFromFilename = buildMediaPathFromFilename(parsed.pathname);
    if (parsedPathFromFilename) {
      return `${origin}${parsedPathFromFilename}`;
    }

    if (LEGACY_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) {
      return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
}
