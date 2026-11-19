import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-[color:var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <span className="font-semibold text-[color:var(--text)]">Rehber</span>
          <span aria-hidden="true">·</span>
          Derece yapmış mentorlardan birebir ders.
        </p>
        <p>
          Ödeme v1&apos;de yok.{" "}
          <Link className="underline underline-offset-4 hover:text-[color:var(--text)]" href="/#nasil-calisir">
            Nasıl çalışır?
          </Link>
        </p>
      </div>
    </footer>
  );
}
