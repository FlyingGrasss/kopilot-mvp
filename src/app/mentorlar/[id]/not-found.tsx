import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function MentorNotFound() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[color:var(--text)]">
          Mentor bulunamadı
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          Bu profil kaldırılmış veya bağlantı hatalı olabilir. Mentor listesinden
          başka bir profili inceleyebilirsin.
        </p>
        <div className="mt-6">
          <Link className={buttonClasses("primary")} href="/mentorlar">
            Mentorlara dön
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
