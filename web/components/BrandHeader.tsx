"use client";

import Link from "next/link";
import Image from "next/image";

type Props = { className?: string };

export default function BrandHeader({ className }: Props) {
  return (
    <header
      className={`w-full border-b border-zinc-100 bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-90 overflow-hidden h-full">
            <Image
              src="/icons/icon-192x192.png"
              alt="Cerply"
              width={64}
              height={64}
              priority
              unoptimized
              className="h-14 w-14 sm:h-16 sm:w-16 object-contain transform scale-125 origin-left"
            />
          </Link>
        </div>

        {/* Center: (removed tagline) */}
        <div className="sr-only">&nbsp;</div>

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