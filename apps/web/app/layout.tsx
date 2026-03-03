import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { MainNav } from "../components/main-nav";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title: "TGMG - Tera Ghar Mera Ghar | Pakistan ka Asli Used Marketplace",
  description:
    "Pakistan ka pehla real-person used marketplace. Ek banda, ek ad, koi agent nahi. Apna ghar ka saaman seedha asli kharedaar tak.",
  metadataBase: new URL("https://www.teragharmeraghar.com"),
  openGraph: {
    title: "TGMG - Tera Ghar Mera Ghar",
    description: "Sirf Asli Log. Sirf Ghar Ka Saaman.",
    type: "website",
    images: ["/brand/TGMG-mark.svg"]
  },
  icons: {
    icon: "/brand/TGMG-favicon.svg",
    shortcut: "/brand/TGMG-favicon.svg",
    apple: "/brand/TGMG-favicon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#C8603A"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <MainNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
