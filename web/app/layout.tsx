import type { Metadata } from "next";
import "../app/globals.css";
import BrandHeader from "@/components/BrandHeader";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Cerply",
  description: "Helping you master what matters",
  // Add version param to bust CDN/browser caches on manifest updates
  manifest: "/manifest.webmanifest?v=2",
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
      </body>
    </html>
  );
}
