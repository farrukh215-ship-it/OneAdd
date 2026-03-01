import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { MainNav } from "../components/main-nav";

export const metadata: Metadata = {
  title: "ZaroratBazar",
  description: "Trust-first resale marketplace for Pakistan.",
  metadataBase: new URL("https://zaroratbazar.shop"),
  openGraph: {
    title: "ZaroratBazar",
    description: "Discover trusted listings, reels, and verified sellers.",
    type: "website",
    images: ["/brand/zaroratbazar-logo-light.svg"]
  },
  icons: {
    icon: "/brand/zaroratbazar-favicon.svg",
    shortcut: "/brand/zaroratbazar-favicon.svg",
    apple: "/brand/zaroratbazar-favicon.svg"
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <MainNav />
        {children}
      </body>
    </html>
  );
}
