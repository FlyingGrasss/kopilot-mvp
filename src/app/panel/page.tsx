import type { Metadata } from "next";
import Link from "next/link";
import { MentorDashboard } from "@/components/panel/MentorDashboard";
import { StudentBookings } from "@/components/panel/StudentBookings";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { displayName, formatPrice } from "@/lib/format";
import {
  getMentor,
  getMyBookings,
  getMySlots,
  requireUser,
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  description: "Ders taleplerini ve açık saatlerini yönet.",
  robots: { index: false, follow: false },
};

export default async function PanelPage() {
  const user = await requireUser("/panel");
  const name = displayName(user.username);

  if (user.role === "mentor") {
    const [bookings, slots, profile] = await Promise.all([
      getMyBookings(),
      getMySlots(),
      getMentor(user.id),
    ]);
    const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
    const acceptedCount = bookings.filter((booking) => booking.status === "accepted").length;
    const openSlotCount = slots.filter((slot) => slot.status === "open").length;

    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader user={user} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Avatar
                color={profile?.avatarColor}
                name={name}
                size="lg"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Mentor paneli
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--text)] sm:text-3xl">
                  Merhaba, {name}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                  Gelen talepleri yanıtla ve yeni ders saatleri aç.
                  {profile ? ` Ders ücretin ${formatPrice(profile.priceTry)}.` : ""}
                </p>
              </div>
            </div>
            {profile ? (
              <Link
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm font-medium text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
                href={`/mentorlar/${profile.id}`}
              >
                Profilim
                <Icon name="arrow-right" size={15} />
              </Link>
            ) : null}
          </div>

          {!profile ? (
            <div
              className="mt-4 rounded-lg border border-[color:var(--warning)] bg-[color:var(--warning-soft)] px-3 py-2.5 text-sm leading-6 text-[color:var(--text)]"
              role="status"
            >
              Mentor profilin bulunamadı. Bu hesap mentor listesinde görünmez;
              destek için demo mentor hesaplarından birini kullanabilirsin.
            </div>
          ) : null}

          <dl className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
              <dt className="text-xs text-[color:var(--muted)]">Bekleyen talep</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[color:var(--text)]">
                {pendingCount}
              </dd>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
              <dt className="text-xs text-[color:var(--muted)]">Açık saat</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[color:var(--text)]">
                {openSlotCount}
              </dd>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
              <dt className="text-xs text-[color:var(--muted)]">Kabul edilen</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[color:var(--text)]">
                {acceptedCount}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <MentorDashboard
              initialBookings={bookings}
              initialSlots={slots}
              profile={profile}
            />
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  const bookings = await getMyBookings();
  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const acceptedCount = bookings.filter((booking) => booking.status === "accepted").length;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Öğrenci paneli
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--text)] sm:text-3xl">
              Ders taleplerin
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
              Mentorların yanıtlarını buradan takip et. Ödeme v1&apos;de yok;
              talepler mentor onayıyla netleşir.
            </p>
          </div>
          <Link
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3 text-sm font-medium text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)]"
            href="/mentorlar"
          >
            Mentor bul
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Badge tone={pendingCount > 0 ? "warning" : "neutral"}>
            {pendingCount} bekleyen
          </Badge>
          <Badge tone={acceptedCount > 0 ? "success" : "neutral"}>
            {acceptedCount} kabul edilen
          </Badge>
        </div>

        <div className="mt-5">
          <StudentBookings initialBookings={bookings} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
