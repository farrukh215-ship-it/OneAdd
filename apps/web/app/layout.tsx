import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { MainNav } from "../components/main-nav";

export const metadata: Metadata = {
  title: "Aikad Marketplace",
  description: "Buy and sell on Aikad Marketplace.",
  openGraph: {
    title: "Aikad Marketplace",
    description: "Discover listings, reels, and trusted sellers.",
    type: "website"
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <MainNav />
        {children}
      </body>
    </html>
  );
}
