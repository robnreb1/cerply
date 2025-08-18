import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Cerply" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body data-domain="rc" data-density="comfortable">
        {children}
      </body>
    </html>
  );
}
