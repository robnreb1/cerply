import "./globals.css";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import BrandHeader from "@/components/BrandHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata = { title: "Cerply" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* Default domain; pages can override with data-domain on body if needed */}
      <body className={inter.className} data-domain="rc" data-density="comfortable">
        <BrandHeader />
        <main className="mx-auto max-w-5xl p-6 space-y-8">{children}</main>
      </body>
    </html>
  );
}
