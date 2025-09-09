"use client";

import Link from "next/link";
import Image from "next/image";

type Props = { className?: string };

export default function BrandHeader({ className }: Props) {
  return (
    <header
      className={`w-full border-b border-zinc-100 bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-90">
            <Image src="/cerply-logo.png" alt="Cerply" width={32} height={32} priority unoptimized />
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