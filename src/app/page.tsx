import type { Metadata } from "next";
import Link from "next/link";
import { MentorCard } from "@/components/mentors/MentorCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getMentors, getSessionUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rehber — Derece yapmış mentorlardan birebir ders",
  description:
    "YKS ve LGS'ye hazırlanan öğrenciler, derece yapmış mentorlarla birebir ders için doğrudan iletişim kurar. Mentorunu seç, uygun saati ayır, talebini gönder.",
};

const steps = [
  {
    title: "Mentorunu seç",
    detail:
      "Sınavına, çalışmak istediğin derse ve bütçene göre mentorları filtrele. Profillerde derece, okul ve ders ücreti açıkça yazar.",
  },
  {
    title: "Uygun saati ayır",
    detail:
      "Mentorun açtığı saatlerden birini seç ve kısa bir not bırak. Talep mentorun paneline düşer; slot onaylanana kadar açık kalır.",
  },
  {
    title: "Mentor onaylasın",
    detail:
      "Mentor talebi kabul ettiğinde saat dolu olur ve ders detayını konuşmak için iletişime geçersiniz. Ödeme v1'de yok.",
  },
];

export default async function HomePage() {
  const [user, mentors] = await Promise.all([
    getSessionUser(),
    getMentors().catch(() => []),
  ]);
  const featured = mentors.slice(0, 3);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]"
              />
              YKS · LGS · YS
            </p>

            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-[color:var(--text)] sm:text-5xl lg:text-[3.4rem]">
              Derece yapmış mentorlardan birebir ders
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--muted)] sm:text-lg sm:leading-8">
              Hedeflediğin bölümü kazanmış mentoru bul, uygun saati seç ve ders
              talebini doğrudan gönder. Aracı yok; mentorun kim olduğunu, neyi
              öğrettiğini ve ücretini önceden görürsün.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link className={buttonClasses("primary", "md")} href="/mentorlar">
                Mentor bul
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link className={buttonClasses("secondary", "md")} href="/kayit?role=mentor">
                Mentor ol
              </Link>
            </div>

            <p className="mt-4 max-w-xl text-xs leading-5 text-[color:var(--muted)]">
              Ödeme v1&apos;de yok. Ücret bilgisi mentor profilinde gösterilir; ders
              talepleri mentor onayıyla netleşir.
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Üç adımda
            </p>
            <ol className="mt-4 space-y-5">
              {steps.map((step, index) => (
                <li className="flex gap-3" key={step.title}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] text-xs font-semibold text-[color:var(--text)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-lg bg-[color:var(--elevated)] px-3 py-2.5 text-xs leading-5 text-[color:var(--muted)]">
              Mentorlar ücretini kendi belirler. Rehber v1&apos;de ödeme almaz ve
              ödeme garantisi vermez.
            </div>
          </div>
        </section>

        <section
          aria-labelledby="featured-title"
          className="border-y border-[color:var(--border)] bg-[color:var(--surface)]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  className="text-2xl font-semibold tracking-tight text-[color:var(--text)]"
                  id="featured-title"
                >
                  Öne çıkan mentorlar
                </h2>
                <p className="mt-1.5 text-sm text-[color:var(--muted)]">
                  Demo verisindeki mentorlardan bir seçki. Tüm profiller gerçek
                  filtrelerle listelenir.
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[color:var(--accent-text)] underline-offset-4 hover:underline"
                href="/mentorlar"
              >
                Tüm mentorları gör
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>

            {featured.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {featured.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[color:var(--border)] px-5 py-8 text-sm text-[color:var(--muted)]">
                Mentor listesi şu anda yüklenemedi.{" "}
                <Link className="font-medium underline underline-offset-4" href="/mentorlar">
                  Mentorlar sayfasını dene.
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20" id="nasil-calisir">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
              Nasıl çalışır?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Rehber bir ders platformu değil, mentor ve öğrenciyi buluşturan bir
              pazar yeri. Dersin içeriğini ve ücretini mentorla birlikte
              netleştirirsin.
            </p>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div className="border-t border-[color:var(--border)] pt-4" key={step.title}>
                <p className="text-xs font-semibold text-[color:var(--muted)]">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-base font-semibold text-[color:var(--text)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="text-base font-semibold text-[color:var(--text)]">
                Öğrenciler için
              </h3>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                Mentorları ücretsiz incele, açık saatleri gör ve talep gönder.
                Ödeme v1&apos;de alınmıyor; talep göndermek için kart bilgisi
                istemiyoruz.
              </p>
            </div>
            <Link className={buttonClasses("secondary", "md")} href="/mentorlar">
              Mentorları incele
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
