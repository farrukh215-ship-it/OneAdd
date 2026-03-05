import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { MainNav } from "../components/main-nav";
import { SiteFooter } from "../components/site-footer";
import { isPremiumUiEnabled } from "../lib/ui-flags";

export const metadata: Metadata = {
  title: "TGMG - Tera Ghar Mera Ghar | Pakistan ka Asli Used Marketplace",
  description:
    "Pakistan ka pehla real-person used marketplace. Ek banda, ek add, duplicate shopkeeper spam block. Apna ghar ka saaman seedha asli kharedaar tak.",
  metadataBase: new URL("https://www.teragharmeraghar.com"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "TGMG - Tera Ghar Mera Ghar",
    description: "Sirf Asli Log. Sirf Ghar Ka Saaman.",
    type: "website",
    url: "https://www.teragharmeraghar.com",
    siteName: "TGMG",
    images: ["/brand/TGMG-mark.svg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "TGMG - Tera Ghar Mera Ghar",
    description: "Sirf Asli Log. Sirf Ghar Ka Saaman.",
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
  const premiumUiEnabled = isPremiumUiEnabled();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "TGMG",
        url: "https://www.teragharmeraghar.com",
        logo: "https://www.teragharmeraghar.com/brand/tgmg-mark.png"
      },
      {
        "@type": "WebSite",
        name: "TGMG",
        url: "https://www.teragharmeraghar.com",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://www.teragharmeraghar.com/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={premiumUiEnabled ? "uiPremiumV1" : "uiClassic"}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <MainNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
