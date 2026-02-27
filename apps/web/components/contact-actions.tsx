import Link from "next/link";
import { Listing } from "../lib/types";

type ContactActionsProps = {
  listing: Listing;
  phone: string;
};

export function ContactActions({ listing, phone }: ContactActionsProps) {
  return (
    <div className="actions">
      {listing.showPhone && phone && <span className="pill">{phone}</span>}
      {listing.allowCall && phone && (
        <a className="btn" href={`tel:${phone}`}>
          Call
        </a>
      )}
      {listing.allowSMS && phone && (
        <a className="btn secondary" href={`sms:${phone}`}>
          SMS
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
