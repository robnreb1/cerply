"use client";

import React from "react";
import Link from "next/link";

export default function SiteFooter() {
  const send = (tab: "popular" | "certified" | "challenge" | "analytics") => () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cerply-shortcut", { detail: { tab } }));
    }
  };

  const inject = (payload: any) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cerply-shortcut", { detail: payload }));
    }
  };

  return (
    <footer className="w-full border-t border-zinc-100 bg-white shadow-sm mt-8">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <nav className="flex items-center justify-center gap-6 text-sm text-zinc-600">
          <a href="#popular" onClick={inject({ tab: 'popular' })} className="hover:text-zinc-900 no-underline">Popular</a>
          <a href="#certified" onClick={inject({ tab: 'certified' })} className="hover:text-zinc-900 no-underline">Certified</a>
          <a href="#challenge" onClick={inject({ tab: 'challenge' })} className="hover:text-zinc-900 no-underline">Challenge</a>
          <a href="#analytics" onClick={inject({ tab: 'analytics' })} className="hover:text-zinc-900 no-underline">Analytics</a>
          <a href="#account" onClick={inject({ tab: 'account' })} className="hover:text-zinc-900 no-underline">Account</a>
          <a href="#about" onClick={inject({ tab: 'about' })} className="hover:text-zinc-900 no-underline">About</a>
        </nav>
      </div>
    </footer>
  );
}



