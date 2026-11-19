"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingDto } from "@shared/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { apiFetch, ApiError } from "@/lib/api";
import {
  BOOKING_STATUS_LABELS,
  displayName,
  formatPrice,
  formatSlotDateTime,
} from "@/lib/format";
import { bookingTone } from "./status";

export interface StudentBookingsProps {
  initialBookings: BookingDto[];
}

export function StudentBookings({ initialBookings }: StudentBookingsProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [target, setTarget] = useState<BookingDto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeDialog(): void {
    if (pending) return;
    setTarget(null);
    setError(null);
  }

  async function handleCancel(): Promise<void> {
    if (!target || pending) return;
    setPending(true);
    setError(null);

    try {
      const body = await apiFetch<{ booking: BookingDto }>(
        `/api/bookings/${target.id}/cancel`,
        { method: "POST" },
      );
      setBookings((previous) =>
        previous.map((booking) => (booking.id === body.booking.id ? body.booking : booking)),
      );
      setTarget(null);
      toast("Ders talebi iptal edildi.", { tone: "success" });
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Talep iptal edilemedi. Tekrar dene.",
      );
    } finally {
      setPending(false);
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-[color:var(--accent)] px-3 text-sm font-medium text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)]"
            href="/mentorlar"
          >
            Mentor bul
          </Link>
        }
        description="Bir mentorun profilinden uygun saati seçip ders talebi gönderebilirsin."
        icon="calendar"
        title="Henüz ders talebin yok"
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs leading-5 text-[color:var(--muted)]">
        Talebin mentor onayına düşer. Kabul edilen bir talebi iptal edersen saat
        yeniden açılır.
      </p>

      <ul className="space-y-3">
        {bookings.map((booking) => {
          const mentorName = displayName(booking.mentor.username);
          const canCancel = booking.status === "pending" || booking.status === "accepted";
          return (
            <li
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-5"
              key={booking.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar
                    color={booking.mentor.avatarColor}
                    name={mentorName}
                    size="md"
                  />
                  <div className="min-w-0">
                    <Link
                      className="text-sm font-semibold text-[color:var(--text)] underline-offset-4 hover:underline"
                      href={`/mentorlar/${booking.mentor.id}`}
                    >
                      {mentorName}
                    </Link>
                    <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {booking.mentor.headline ?? "Mentor"}
                    </p>
                  </div>
                </div>
                <Badge tone={bookingTone(booking.status)}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium text-[color:var(--text)]">
                  {formatSlotDateTime(booking.slot.startsAt, booking.slot.durationMin)}
                </span>
                {booking.mentor.priceTry !== null ? (
                  <span className="text-[color:var(--muted)]">
                    {formatPrice(booking.mentor.priceTry)} · ödeme v1&apos;de yok
                  </span>
                ) : null}
              </div>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[color:var(--muted)]">
                {booking.message}
              </p>

              {canCancel ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => {
                      setTarget(booking);
                      setError(null);
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {booking.status === "accepted" ? "Talebi iptal et" : "Talebi geri çek"}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        confirmLabel="Talebi iptal et"
        description={
          target
            ? `${displayName(target.mentor.username)} · ${formatSlotDateTime(
                target.slot.startsAt,
                target.slot.durationMin,
              )}. ${
                target.status === "accepted"
                  ? "Kabul edilmiş talep iptal edilirse saat yeniden açılır."
                  : "Talep geri çekilecek."
              }`
            : ""
        }
        error={error}
        onClose={closeDialog}
        onConfirm={() => void handleCancel()}
        open={target !== null}
        pending={pending}
        title="Ders talebini iptal et"
      />
    </div>
  );
}
