import Image from "next/image";
import Link from "next/link";

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
          <div className="footer-social">
            <button className="social-btn" type="button" aria-label="Facebook">
              f
            </button>
            <button className="social-btn" type="button" aria-label="Instagram">
              o
            </button>
            <button className="social-btn" type="button" aria-label="YouTube">
              &gt;
            </button>
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
              <Link href="/my-listings">Meri Listings</Link>
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
