import Link from "next/link";
import { Listing } from "../lib/types";

type ContactActionsProps = {
  listing: Listing;
  phone: string;
};

export function ContactActions({ listing, phone }: ContactActionsProps) {
  const waPhone = phone.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${waPhone}`;

  return (
    <div className="actions">
      {listing.showPhone && phone && <span className="pill">{phone}</span>}
      {listing.allowCall && phone && (
        <a className="btn" href={`tel:${phone}`}>
          Call
        </a>
      )}
      {listing.allowSMS && phone && (
        <a className="btn secondary" href={whatsappHref} target="_blank" rel="noreferrer">
          <span className="actionIcon" aria-hidden="true">
            WA
          </span>
          WhatsApp
        </a>
      )}
      {listing.allowChat ? (
        <Link className="btn secondary" href="/chat">
          Chat
        </Link>
      ) : (
        <span className="pill muted">Chat disabled</span>
      )}
    </div>
  );
}
