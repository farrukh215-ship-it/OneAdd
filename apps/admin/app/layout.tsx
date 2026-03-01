import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";

export const metadata: Metadata = {
  title: "ZaroratBazar Admin Panel",
  description: "Moderation and operations panel for ZaroratBazar marketplace.",
  icons: {
    icon: "/brand/zaroratbazar-favicon.svg",
    shortcut: "/brand/zaroratbazar-favicon.svg"
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
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
