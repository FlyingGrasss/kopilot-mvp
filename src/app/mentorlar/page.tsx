import type { Metadata } from "next";
import Link from "next/link";
import { MentorCard } from "@/components/mentors/MentorCard";
import { MentorFilters } from "@/components/mentors/MentorFilters";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMentors, getSessionUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentorlar",
  description:
    "YKS, LGS ve YS için derece yapmış mentorları sınav, ders ve ücret filtreleriyle incele.",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

interface MentorlarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MentorlarPage({ searchParams }: MentorlarPageProps) {
  const params = await searchParams;
  const exam = firstParam(params.exam)?.trim() || undefined;
  const subject = firstParam(params.subject)?.trim() || undefined;
  const maxPrice = firstParam(params.maxPrice)?.trim() || undefined;

  const [user, result] = await Promise.all([
    getSessionUser(),
    getMentors({ exam, subject, maxPrice })
      .then((mentors) => ({ mentors, failed: false }))
      .catch(() => ({ mentors: [], failed: true })),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--text)] sm:text-4xl">
            Mentorlar
          </h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Derece yapmış mentorları incele; sınav, ders ve ücret filtreleriyle
            hedefine uygun olanı bul. Profillerde açık saatler ve ders ücreti
            görünür.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <MentorFilters exam={exam} maxPrice={maxPrice} subject={subject} />
          </div>

          <section aria-labelledby="mentor-results-title">
            <div className="flex items-center justify-between gap-3">
              <h2
                className="text-sm font-semibold text-[color:var(--text)]"
                id="mentor-results-title"
              >
                {result.failed
                  ? "Sonuçlar yüklenemedi"
                  : `${result.mentors.length} mentor`}
              </h2>
              <p className="text-xs text-[color:var(--muted)]">
                Ücretler ders başına, TL
              </p>
            </div>

            {result.failed ? (
              <div
                className="mt-4 rounded-xl border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--danger-text)]"
                role="alert"
              >
                Mentor listesine ulaşılamadı. Filtreleri kontrol edip sayfayı
                yenilemeyi dene.
              </div>
            ) : result.mentors.length === 0 ? (
              <EmptyState
                action={
                  <Link
                    className="inline-flex h-9 items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm font-medium text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
                    href="/mentorlar"
                  >
                    Filtreleri temizle
                  </Link>
                }
                className="mt-4"
                description="Farklı bir sınav, ders veya ücret aralığı deneyebilirsin."
                icon="search"
                title="Bu filtrelerle mentor bulunamadı"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {result.mentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
