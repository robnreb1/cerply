import "./globals.css";
import type { ReactNode } from "react";
import BrandHeader from "../components/BrandHeader";

export const metadata = { title: "Cerply" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body data-domain="rc" data-density="comfortable">
        <BrandHeader />
        {children}
      </body>
    </html>
  );
}
