import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-white">
      <div className="page-wrap grid gap-6 px-4 py-8 md:grid-cols-4 md:px-5">
        <div>
          <div className="text-2xl font-extrabold text-red">TGMG.</div>
          <p className="mt-2 text-sm text-ink2">
            Pakistan ka simple marketplace. Asli malik, saaf browsing, fast deals.
          </p>
        </div>
        <div>
          <div className="font-bold text-ink">Browse</div>
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <Link href="/listings">Saari Listings</Link>
            <div>Mobiles</div>
            <div>Gaadiyaan</div>
          </div>
        </div>
        <div>
          <div className="font-bold text-ink">Account</div>
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <Link href="/auth">Login</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/post">Ad Post Karo</Link>
          </div>
        </div>
        <div>
          <div className="font-bold text-ink">TGMG Rule</div>
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <div>Ek banda, ek ad</div>
            <div>No dealer clutter</div>
            <div>Sirf asli malik</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
