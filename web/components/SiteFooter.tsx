"use client";

import React from "react";

export default function SiteFooter() {
  const send = (tab: "popular" | "certified" | "challenge" | "analytics") => () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cerply-shortcut", { detail: { tab } }));
    }
  };

  return (
    <footer className="w-full border-t border-zinc-100 bg-white shadow-sm mt-8">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <nav className="flex gap-6 text-sm text-zinc-600">
          <button onClick={send("popular")} className="hover:text-zinc-900">Popular searches</button>
          <button onClick={send("certified")} className="hover:text-zinc-900">Cerply Certified</button>
          <button onClick={send("challenge")} className="hover:text-zinc-900">Challenge</button>
          <button onClick={send("analytics")} className="hover:text-zinc-900">Analytics</button>
        </nav>
        <div className="text-[10px] text-zinc-400">Shortcuts</div>
      </div>
    </footer>
  );
}


