import type { Metadata } from "next";
import "../app/globals.css";
import BrandHeader from "@/components/BrandHeader";

export const metadata: Metadata = {
  title: "Cerply",
  description: "Helping you master what matters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* Real top bar */}
        <BrandHeader />
        {/* Main content */}
        {children}
      </body>
    </html>
  );
}
