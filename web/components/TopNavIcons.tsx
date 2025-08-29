"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const items: Item[] = [
  {
    href: "/curate",
    label: "Curate",
    icon: (
      // Magic/wand
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
        <path fill="currentColor" d="m20 2l2 2l-7 7l-2-2zM3 21l5.6-1.5L20 8.1l-2.1-2.1L6.5 17.4z" />
      </svg>
    ),
  },
  {
    href: "/",
    label: "Learn",
    icon: (
      // Book
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
        <path fill="currentColor" d="M6 4h7a3 3 0 0 1 3 3v13H9a3 3 0 0 0-3 3zM6 4a3 3 0 0 0-3 3v16a3 3 0 0 1 3-3h10V7a3 3 0 0 0-3-3z" />
      </svg>
    ),
  },
  {
    href: "/coverage",
    label: "Coverage",
    icon: (
      // Shield check
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
        <path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11c4.6-1.3 8-6 8-11V5z" />
        <path fill="#fff" d="m10.5 14.6l-2.1-2.1L7.3 13.6l3.2 3.2l6.2-6.2l-1.1-1.1z" />
      </svg>
    ),
  },
  {
    href: "/analytics/pilot",
    label: "Analytics",
    icon: (
      // Chart bars
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
        <path fill="currentColor" d="M3 21h18v-2H3zM7 17h2v-6H7zm4 0h2V7h-2zm4 0h2v-9h-2z" />
      </svg>
    ),
  },
];

export default function TopNavIcons() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 sm:gap-2.5">
      {items.map(({ href, label, icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className={[
              "grid place-items-center h-10 w-10 rounded-xl border",
              "bg-white border-black/10 text-black/60 hover:text-black",
              active ? "text-black shadow-sm" : "",
              "transition-colors"
            ].join(" ")}
          >
            {icon}
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
