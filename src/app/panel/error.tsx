"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
        Panel
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--text)]">
        Panel yüklenemedi
      </h1>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
        API sunucusuna ulaşılamadı veya oturumun sona erdi. Tekrar deneyebilir ya
        da giriş sayfasına dönebilirsin.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={reset} type="button">
          Tekrar dene
        </Button>
        <Link
          className="inline-flex h-10 items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm font-medium text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
          href="/giris?next=/panel"
        >
          Giriş yap
        </Link>
      </div>
    </main>
  );
}
