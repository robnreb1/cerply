"use client";

import Link from "next/link";

type Props = { className?: string };

export default function BrandHeader({ className }: Props) {
  return (
    <header
      className={`w-full border-b border-zinc-100 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${className ?? ""}`}
    >
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="min-w-0">
          <Link href="/" className="font-semibold text-zinc-900 hover:opacity-80">
            Cerply
          </Link>
        </div>

        {/* Center: reassurance copy (desktop only to avoid crowding) */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center text-sm italic text-zinc-500 sm:block">
          Helping you master what matters
        </div>

        {/* Right: login */}
        <nav className="ml-auto flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}