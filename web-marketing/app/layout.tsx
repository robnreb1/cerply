import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cerply.com';
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Cerply – Learn anything. Remember everything.',
  description:
    'Turn policies, regs, notes and transcripts into bite-size, spaced, adaptive learning. Quality first; certified by experts when it matters.',
  keywords: [
    'learning',
    'adaptive learning',
    'spaced repetition',
    'compliance training',
    'enterprise learning',
    'certified content',
  ],
  authors: [{ name: 'Cerply' }],
  creator: 'Cerply',
  publisher: 'Cerply',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Cerply',
    title: 'Cerply – Learn anything. Remember everything.',
    description:
      'Turn policies, regs, notes and transcripts into bite-size, spaced, adaptive learning. Quality first; certified by experts when it matters.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Cerply',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cerply – Learn anything. Remember everything.',
    description:
      'Turn policies, regs, notes and transcripts into bite-size, spaced, adaptive learning.',
    images: ['/og.png'],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Plausible Analytics */}
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Cerply',
              url: siteUrl,
              logo: `${siteUrl}/og.png`,
              description:
                'Turn policies, regs, notes and transcripts into bite-size, spaced, adaptive learning.',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'hello@cerply.com',
                contactType: 'Customer Service',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Cerply',
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              description:
                'Adaptive learning platform with certified content and spaced repetition.',
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

