import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlotPicker } from "@/components/mentors/SlotPicker";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { withNext } from "@/lib/auth";
import { displayName, examLabel, formatPrice } from "@/lib/format";
import { getMentor, getSessionUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentor profili",
  description:
    "Mentorun derecesini, okulunu, derslerini, ücretini ve açık saatlerini incele.",
};

interface MentorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MentorDetailPage({ params }: MentorDetailPageProps) {
  const { id } = await params;
  const [user, mentor] = await Promise.all([getSessionUser(), getMentor(id)]);

  if (!mentor) notFound();

  const name = displayName(mentor.username);
  const loginHref = withNext("/giris", `/mentorlar/${mentor.id}`);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)]"
          href="/mentorlar"
        >
          <Icon name="arrow-left" size={15} />
          Tüm mentorlar
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div>
            <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar color={mentor.avatarColor} name={name} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text)] sm:text-3xl">
                      {name}
                    </h1>
                    <Badge tone="accent">{examLabel(mentor.exam)}</Badge>
                  </div>
                  <p className="mt-2 text-base font-medium leading-7 text-[color:var(--text)]">
                    {mentor.headline}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-[color:var(--muted)]">
                    <Icon name="graduation-cap" size={15} />
                    {mentor.university} · {mentor.department}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{mentor.score}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {mentor.subjects.map((subject) => (
                  <span
                    className="rounded-md bg-[color:var(--elevated)] px-2.5 py-1 text-xs font-medium text-[color:var(--text)]"
                    key={subject}
                  >
                    {subject}
                  </span>
                ))}
              </div>

              {mentor.bio ? (
                <div className="mt-6 border-t border-[color:var(--border)] pt-5">
                  <h2 className="text-sm font-semibold text-[color:var(--text)]">
                    Mentor hakkında
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[color:var(--muted)]">
                    {mentor.bio}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[color:var(--text)]">
                    Ders ücreti
                  </h2>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--text)]">
                    {formatPrice(mentor.priceTry)}
                    <span className="ml-1 text-sm font-normal text-[color:var(--muted)]">
                      / ders
                    </span>
                  </p>
                </div>
                <span className="rounded-md border border-[color:var(--border)] bg-[color:var(--elevated)] px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]">
                  Ödeme v1&apos;de yok
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                Ücreti mentor belirler. Rehber v1&apos;de ödeme almaz; talep
                göndermek için kart bilgisi istemiyoruz. Dersin kapsamını ve
                ücreti mentorla birlikte netleştirirsin.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <section
              aria-labelledby="slots-title"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[color:var(--text)]" id="slots-title">
                    Uygun saatler
                  </h2>
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                    Türkiye saati (GMT+3)
                  </p>
                </div>
                <Badge>{mentor.openSlots.length} açık</Badge>
              </div>

              <div className="mt-4">
                <SlotPicker
                  loginHref={loginHref}
                  mentor={mentor}
                  slots={mentor.openSlots}
                  viewer={user}
                />
              </div>
            </section>

            <p className="mt-3 px-1 text-xs leading-5 text-[color:var(--muted)]">
              Talep mentor onayına düşer. Onaylandığında saat dolu olur; ödeme ve
              ders detayını mentorla konuşursun. Profil bilgileri mentorun kendi
              beyanıdır; Rehber v1&apos;de belge doğrulaması yapmaz.
            </p>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
