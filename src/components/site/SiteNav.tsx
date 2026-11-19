"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/mentorlar", label: "Mentorlar", match: "/mentorlar" },
  { href: "/#nasil-calisir", label: "Nasıl çalışır?", match: null },
];

export interface SiteNavProps {
  panelHref?: string;
}

export function SiteNav({ panelHref }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Ana menü" className="hidden items-center gap-1 sm:flex">
      {links.map((link) => {
        const current = link.match ? pathname.startsWith(link.match) : false;
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              current
                ? "bg-[color:var(--elevated)] text-[color:var(--text)]"
                : "text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)]",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
      {panelHref ? (
        <Link
          aria-current={pathname.startsWith(panelHref) ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(panelHref)
              ? "bg-[color:var(--elevated)] text-[color:var(--text)]"
              : "text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)]",
          )}
          href={panelHref}
        >
          Panel
        </Link>
      ) : null}
    </nav>
  );
}
