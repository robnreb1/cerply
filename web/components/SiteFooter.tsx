"use client";

import React from "react";
import Link from "next/link";

export default function SiteFooter() {
  const send = (tab: "popular" | "certified" | "challenge" | "analytics") => () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cerply-shortcut", { detail: { tab } }));
    }
  };

  return (
    <footer className="w-full border-t border-zinc-100 bg-white shadow-sm mt-8">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <nav className="flex items-center justify-center gap-6 text-sm text-zinc-600">
          <Link href="/popular" className="hover:text-zinc-900 no-underline">Popular</Link>
          <Link href="/certified" className="hover:text-zinc-900 no-underline">Certified</Link>
          <Link href="/challenge" className="hover:text-zinc-900 no-underline">Challenge</Link>
          <Link href="/analytics" className="hover:text-zinc-900 no-underline">Analytics</Link>
          <Link href="/account" className="hover:text-zinc-900 no-underline">Account</Link>
          <Link href="/about" className="hover:text-zinc-900 no-underline">About</Link>
        </nav>
      </div>
    </footer>
  );
}



