"use client";

type ShareActionsProps = {
  listingId: string;
  title: string;
};

export function ShareActions({ listingId, title }: ShareActionsProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/listing/${listingId}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
  }

  return (
    <div className="actions">
      <a className="btn secondary" href={fbUrl} target="_blank" rel="noreferrer">
        Share on Facebook
      </a>
      <button className="btn secondary" onClick={copyLink} type="button">
        Copy Link
      </button>
      <span className="shareHint">{title}</span>
    </div>
  );
}
