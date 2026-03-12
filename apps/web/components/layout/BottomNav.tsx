'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white md:hidden">
      <div className="grid grid-cols-5 items-end px-2 pt-2">
        <BottomItem href="/" icon="🏠" label="Home" active={pathname === '/'} />
        <BottomItem href="/listings" icon="🔍" label="Browse" active={pathname.startsWith('/listings')} />
        <Link
          href="/post"
          className="-mt-5 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red text-2xl font-bold text-white shadow-card2"
          aria-label="Ad post karo"
        >
          +
        </Link>
        <BottomItem href="/profile?saved=1" icon="❤️" label="Saved" active={pathname === '/saved'} />
        <BottomItem href="/profile" icon="👤" label="Profile" active={pathname === '/profile'} />
      </div>
    </nav>
  );
}

function BottomItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-2 text-[11px] ${
        active ? 'text-red' : 'text-ink2'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-semibold">{label}</span>
    </Link>
  );
}

