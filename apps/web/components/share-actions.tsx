"use client";

type ShareActionsProps = {
  listingId: string;
  title: string;
};

export function ShareActions({ listingId, title }: ShareActionsProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/listing/${listingId}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${title} - ${link}`)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
  }

  return (
    <section className="shareActionsPanel">
      <p className="sharePanelLabel">Share this listing</p>
      <div className="shareActionGrid">
        <a className="btn secondary" href={fbUrl} target="_blank" rel="noreferrer">
          <span className="actionIcon" aria-hidden="true">
            f
          </span>
          Share on Facebook
        </a>
        <a className="btn secondary" href={waUrl} target="_blank" rel="noreferrer">
          <span className="actionIcon" aria-hidden="true">
            WA
          </span>
          Share on WhatsApp
        </a>
        <button className="btn secondary" onClick={copyLink} type="button">
          <span className="actionIcon" aria-hidden="true">
            #
          </span>
          Copy Link
        </button>
      </div>
      <p className="shareHint">{title}</p>
    </section>
  );
}
