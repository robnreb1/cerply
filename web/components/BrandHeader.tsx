'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

function NavLink({ href, children }: PropsWithChildren<{ href: string }>) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        "px-3 py-1.5 rounded-8 transition-colors duration-hover ease-brand " +
        (active
          ? "bg-[var(--role-primary)] text-[var(--role-onPrimary)]"
          : "text-brand-ink/80 hover:bg-[var(--brand-surface2)]")
      }
    >
      {children}
    </Link>
  );
}

export default function BrandHeader() {
  return (
    <header className="relative">
      <div className="hero-gradient h-28 w-full rounded-b-16"></div>
      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-5xl px-6 pb-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="relative z-10 flex items-center gap-2">
              <div className="h-8 w-8 rounded-12" style={{ background: "var(--gradient-coral-linear)" }} />
              <span className="text-xl font-semibold tracking-[0.005em] text-white drop-shadow">
                Cerply
              </span>
            </Link>
            <nav className="relative z-10 flex items-center gap-1">
              <NavLink href="/curate">Curate</NavLink>
              <NavLink href="/learn">Learn</NavLink>
              <NavLink href="/style">Style</NavLink>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
