import "./globals.css";
import type { ReactNode } from "react";
import BrandHeader from "../components/BrandHeader";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

export const metadata = { 
  title: "Cerply",
  manifest: "/manifest.webmanifest",
  themeColor: "#ff6b6b",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cerply"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ff6b6b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cerply" />
      </head>
      <body data-domain="rc" data-density="comfortable">
        <BrandHeader />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
