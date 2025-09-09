import type { Metadata } from "next";
import "../app/globals.css";
import BrandHeader from "@/components/BrandHeader";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Cerply",
  description: "Helping you master what matters",
  // Add version param to bust CDN/browser caches on manifest updates
  manifest: "/manifest.webmanifest?v=2",
  metadataBase: new URL("https://cerply.com"),
  openGraph: {
    title: "Cerply — Turn information into knowledge",
    description: "Plan-first AI learning that adapts and proves progress.",
    url: "https://cerply.com/",
    siteName: "Cerply",
    images: [
      { url: "/icons/icon-512x512.png", width: 512, height: 512, alt: "Cerply" }
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cerply — Turn information into knowledge",
    description: "Plan-first AI learning that adapts and proves progress.",
    images: ["/icons/icon-512x512.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ServiceWorkerRegistration />
        {/* Real top bar */}
        <BrandHeader />
        {/* Main content */}
        {children}
        {/* Global footer with shortcuts */}
        <SiteFooter />
      </body>
    </html>
  );
}
