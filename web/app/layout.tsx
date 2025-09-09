import type { Metadata } from "next";
import "../app/globals.css";
import BrandHeader from "@/components/BrandHeader";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Cerply",
  description: "Helping you master what matters",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased flex flex-col">
        <ServiceWorkerRegistration />
        {/* Real top bar */}
        <BrandHeader />
        {/* Main content */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
        {/* Global footer */}
        <SiteFooter />
      </body>
    </html>
  );
}
