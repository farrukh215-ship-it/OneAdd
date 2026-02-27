"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearToken, getToken } from "../lib/api";

const links = [
  { href: "/categories", label: "Categories" },
  { href: "/listings", label: "Listings" },
  { href: "/reports", label: "Reports Queue" },
  { href: "/users", label: "Users" },
  { href: "/feature-flags", label: "Feature Flags" },
  { href: "/audit-logs", label: "Audit Logs" }
];

type AdminShellProps = {
  title: string;
  children: ReactNode;
};

export function AdminShell({ title, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <main className="screen">Loading...</main>;
  }

  return (
    <div className="adminLayout">
      <aside className="sidebar">
        <h2>Aikad Admin</h2>
        <nav className="sidebarNav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "sideLink active" : "sideLink"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </aside>
      <main className="screen">
        <header className="sectionHeader">
          <h1>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
