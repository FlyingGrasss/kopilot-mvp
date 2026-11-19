import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[color:var(--text)]"
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
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)]"
          href="/mentorlar"
        >
          Mentorlar
          <Icon name="arrow-right" size={15} />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-[color:var(--muted)]">
        Rehber · Derece yapmış mentorlardan birebir ders. Ödeme v1&apos;de yok.
      </footer>
    </div>
  );
}
