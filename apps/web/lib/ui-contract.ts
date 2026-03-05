export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type CardVariant = "elevated" | "outlined" | "flat";
export type InputState = "default" | "focused" | "invalid" | "disabled";
export type BadgeTone = "neutral" | "success" | "warn" | "danger" | "muted";

type ListingDisplayParams = {
  city?: string | null;
  exactLocation?: string | null;
  description?: string | null;
};

function extractMetadataValue(description: string, key: "city" | "location" | "area") {
  const match = description.match(new RegExp(`\\b${key}\\s*:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

export function displayCategoryPath(mainCategory?: string | null, subCategory?: string | null) {
  const main = mainCategory?.trim();
  const sub = subCategory?.trim();
  if (main && sub) {
    return `${main} / ${sub}`;
  }
  return main || sub || "";
}

export function displayLocation(params: ListingDisplayParams) {
  const description = params.description ?? "";
  const fallbackCity = extractMetadataValue(description, "city");
  const fallbackArea =
    extractMetadataValue(description, "location") || extractMetadataValue(description, "area");

  const city = (params.city?.trim() || fallbackCity || "Pakistan").trim();
  const area = (params.exactLocation?.trim() || fallbackArea || "").trim();
  return area ? `${city} / ${area}` : city;
}

export function displayListedDate(value?: string) {
  if (!value) {
    return "Listed recently";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Listed recently";
  }
  return `Listed on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })}`;
}

export function displayRelativeTime(value?: string | null) {
  if (!value) {
    return "just now";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function displaySellerLastSeen(value?: string | null) {
  if (!value) {
    return "Seller online recently";
  }
  return `Seller online ${displayRelativeTime(value)}`;
}

export function displayTrustScoreNote(score: number) {
  if (score >= 80) {
    return "High trust seller: fast replies, verified details and successful deals.";
  }
  if (score >= 50) {
    return "Trusted seller: profile details and response quality are improving.";
  }
  return "Trust score 0 means new seller profile; verified details and successful deals increase it.";
}
