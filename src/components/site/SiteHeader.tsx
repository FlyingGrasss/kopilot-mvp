import Link from "next/link";
import type { UserDto } from "@shared/types";
import { buttonClasses } from "@/components/ui/Button";
import { AccountMenu } from "./AccountMenu";
import { SiteNav } from "./SiteNav";

export interface SiteHeaderProps {
  user: UserDto | null;
}

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg)]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            className="inline-flex items-center gap-2 rounded-lg text-base font-semibold tracking-tight text-[color:var(--text)]"
            href="/"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--accent)] text-sm font-bold text-[color:var(--accent-contrast)]"
            >
              R
            </span>
            Rehber
          </Link>
          <SiteNav panelHref={user ? "/panel" : undefined} />
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-lg px-2 py-2 text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] sm:hidden"
            href="/mentorlar"
          >
            Mentorlar
          </Link>
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <>
              <Link
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)] sm:inline-flex"
                href="/giris"
              >
                Giriş yap
              </Link>
              <Link className={buttonClasses("primary", "sm")} href="/kayit">
                Hesap oluştur
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
