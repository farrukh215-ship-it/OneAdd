import { tgmgContact } from '../../lib/contact';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-white">
      <div className="page-wrap grid gap-6 px-4 py-8 md:grid-cols-4 md:px-5">
        <div>
          <div className="text-2xl font-extrabold text-red">TGMG.</div>
          <p className="mt-2 text-sm text-ink2">
            Pakistan ka premium marketplace. Asli malik, saaf browsing, fast deals.
          </p>
          <div className="mt-3 text-sm text-ink2">
            <div>Office: {tgmgContact.office}</div>
            <a className="text-red underline" href={`mailto:${tgmgContact.email}`}>
              {tgmgContact.email}
            </a>
          </div>
        </div>
        <div>
          <div className="font-bold text-ink">Browse</div>
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <Link href="/listings">Saari Listings</Link>
            <Link href="/listings?category=mobiles">Mobiles</Link>
            <Link href="/listings?category=cars">Gaadiyaan</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <div className="font-bold text-ink">Account</div>
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <Link href="/auth">Login / Sign Up</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/post">Ad Post Karo</Link>
            <Link href="/listings?saved=true">Saved Ads</Link>
          </div>
        </div>
        <div>
          <div className="font-bold text-ink">Connect</div>
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <a href={tgmgContact.website} target="_blank" rel="noreferrer">
              www.teragharmeraghar.com
            </a>
            <a href={tgmgContact.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href={tgmgContact.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={tgmgContact.whatsapp} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={`tel:${tgmgContact.phone.replace(/\s+/g, '')}`}>{tgmgContact.phone}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
