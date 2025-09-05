import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const ServiceWorkerRegistration = dynamic(() => import('../components/ServiceWorkerRegistration'), { ssr: false });
const InstallPrompt = dynamic(() => import('../components/InstallPrompt'), { ssr: false });

export const metadata: Metadata = {
  title: 'Cerply',
  description: 'Learn better with a light, intelligent assistant.',
  metadataBase: new URL('https://cerply.com'),
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Cerply — AI‑first learning orchestrator',
    description: 'Tell Cerply your goal. It plans modules, generates micro‑lessons, and adapts daily.',
    url: 'https://cerply.com',
    siteName: 'Cerply',
    images: [
      { url: '/cerply-logo.png', width: 512, height: 512, alt: 'Cerply' }
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cerply — AI‑first learning orchestrator',
    description: 'Plans modules, generates micro‑lessons, adapts daily.',
    images: ['/cerply-logo.png'],
  },
};

// Web login page (front-end); avoids linking directly to API route
const loginHref = '/login';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900">
        <header className="w-full border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
            <Link href="/" className="font-medium hover:opacity-80">Cerply</Link>
            <Link href={loginHref} className="text-sm hover:underline">Log in</Link>
          </div>
        </header>
        {children}
        <ServiceWorkerRegistration />
        <InstallPrompt />
      </body>
    </html>
  );
}