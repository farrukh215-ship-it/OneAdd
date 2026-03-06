import Image from "next/image";
import Link from "next/link";

const footerSignals = [
  { label: "Verified sellers", detail: "CNIC + real-person first" },
  { label: "Smart discovery", detail: "Live suggestions + city targeting" },
  { label: "Fast actions", detail: "Save, chat, WhatsApp ready" }
];

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand-lockup">
            <Image
              src="/brand/tgmg-full.png"
              alt="TGMG logo"
              width={260}
              height={145}
              className="footer-brand-image"
            />
          </div>
          <div className="footer-brand-domain">TeraGharMeraGhar.com</div>
          <p className="footer-brand-desc">
            Pakistan ka pehla real-person used marketplace. Tera Dil Ka Saaman -
            Mere Ghar Ka Hissa.
          </p>
          <div className="footer-signal-list">
            {footerSignals.map((item) => (
              <div className="footer-signal-chip" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
          <div className="footer-social">
            <Link className="social-btn social-link-btn" href="/search">
              Search
            </Link>
            <Link className="social-btn social-link-btn" href="/my-listings">
              Saved + Ads
            </Link>
            <Link className="social-btn social-link-btn" href="/sell">
              Sell Fast
            </Link>
          </div>
          <div className="footer-cta-panel">
            <p className="footer-cta-kicker">Start in seconds</p>
            <h3 className="footer-cta-title">Apna ghar ka saaman seedha verified buyers tak.</h3>
            <div className="footer-cta-actions">
              <Link href="/sell" className="footer-cta-primary">
                Apna Saaman Becho
              </Link>
              <Link href="/search" className="footer-cta-secondary">
                Dhundo
              </Link>
            </div>
          </div>
        </div>

        <div>
          <h3 className="footer-col-title">Marketplace</h3>
          <ul className="footer-links">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/search">Dhundo</Link>
            </li>
            <li>
              <Link href="/sell">Apna Saaman Becho</Link>
            </li>
            <li>
              <Link href="/my-listings">Mere Ads</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="footer-col-title">Community</h3>
          <ul className="footer-links">
            <li>
              <Link href="/chat">Chat</Link>
            </li>
            <li>
              <Link href="/reels">Reels</Link>
            </li>
            <li>
              <Link href="/account">Login</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="footer-col-title">Trust</h3>
          <ul className="footer-links">
            <li>
              <a href="#">CNIC Verified</a>
            </li>
            <li>
              <a href="#">Shopkeeper Spam Blocked</a>
            </li>
            <li>
              <a href="#">Ek Banda Ek Add</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-copy">
          Copyright 2025 TeraGharMeraGhar.com - <span>Pakistan</span>
        </div>
        <div className="footer-tagline-final">Tera Dil Ka Saaman - Mere Ghar Ka Hissa</div>
      </div>
    </footer>
  );
}
