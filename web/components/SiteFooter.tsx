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
          <button onClick={send("popular")} className="hover:text-zinc-900">Popular</button>
          <button onClick={send("certified")} className="hover:text-zinc-900">Certified</button>
          <button onClick={send("challenge")} className="hover:text-zinc-900">Challenge</button>
          <button onClick={send("analytics")} className="hover:text-zinc-900">Analytics</button>
          <Link href="/account" className="hover:text-zinc-900">Account</Link>
          <Link href="/about" className="hover:text-zinc-900">About</Link>
        </nav>
      </div>
    </footer>
  );
}



