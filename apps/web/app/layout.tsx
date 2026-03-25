import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { ReactQueryProvider } from './providers';
import { ExperienceBoot } from '../components/layout/ExperienceBoot';
import { Navbar } from '../components/layout/Navbar';
import { BottomNav } from '../components/layout/BottomNav';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'TGMG',
  description: 'Simple marketplace for Pakistan',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} app-shell`}>
        <ReactQueryProvider>
          <ExperienceBoot />
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main>{children}</main>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
