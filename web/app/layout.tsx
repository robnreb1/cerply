import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cerply',
  description: 'Learn better with a light, intelligent assistant.',
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
      </body>
    </html>
  );
}