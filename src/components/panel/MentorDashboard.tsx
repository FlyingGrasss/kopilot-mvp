"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { BookingDto, MentorDetail, MentorSlotDto } from "@shared/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toaster";
import { apiFetch, ApiError } from "@/lib/api";
import {
  BOOKING_STATUS_LABELS,
  SLOT_STATUS_LABELS,
  displayName,
  formatLongDate,
  formatSlotDateTime,
  formatSlotRange,
  formatSlotTime,
  istanbulDateTimeToEpoch,
  todayIstanbulIso,
} from "@/lib/format";
import { bookingTone, slotTone } from "./status";

const TIME_OPTIONS = Array.from({ length: 25 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}).filter((value) => value <= "21:00");

export interface MentorDashboardProps {
  profile: MentorDetail | null;
  initialBookings: BookingDto[];
  initialSlots: MentorSlotDto[];
}

export function MentorDashboard({
  profile,
  initialBookings,
  initialSlots,
}: MentorDashboardProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [slots, setSlots] = useState(initialSlots);

  const [action, setAction] = useState<{ id: string; kind: "accept" } | null>(null);
  const [declineTarget, setDeclineTarget] = useState<BookingDto | null>(null);
  const [declinePending, setDeclinePending] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const [date, setDate] = useState(todayIstanbulIso(Date.now() + 86_400_000));
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState("60");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotPending, setSlotPending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MentorSlotDto | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const pendingRequests = bookings.filter((booking) => booking.status === "pending");
  const history = bookings.filter((booking) => booking.status !== "pending");
  const sortedSlots = [...slots].sort((a, b) => a.startsAt - b.startsAt);

  async function handleAccept(booking: BookingDto): Promise<void> {
    if (action) return;
    setAction({ id: booking.id, kind: "accept" });

    try {
      const body = await apiFetch<{ booking: BookingDto }>(
        `/api/bookings/${booking.id}/accept`,
        { method: "POST" },
      );
      const updated = body.booking;
      setBookings((previous) =>
        previous.map((item) => {
          if (item.id === updated.id) return updated;
          if (item.slot.id === updated.slot.id && item.status === "pending") {
            return { ...item, status: "declined", updatedAt: Date.now() };
          }
          return item;
        }),
      );
      setSlots((previous) =>
        previous.map((slot) =>
          slot.id === updated.slot.id
            ? { ...slot, status: "booked", pendingCount: 0 }
            : slot,
        ),
      );
      toast("Talep kabul edildi; saat dolu olarak işaretlendi.", { tone: "success" });
      router.refresh();
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Talep kabul edilemedi. Tekrar dene.",
        { tone: "error" },
      );
    } finally {
      setAction(null);
    }
  }

  function closeDecline(): void {
    if (declinePending) return;
    setDeclineTarget(null);
    setDeclineError(null);
  }

  async function handleDecline(): Promise<void> {
    if (!declineTarget || declinePending) return;
    setDeclinePending(true);
    setDeclineError(null);

    try {
      const body = await apiFetch<{ booking: BookingDto }>(
        `/api/bookings/${declineTarget.id}/decline`,
        { method: "POST" },
      );
      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === body.booking.id ? body.booking : booking,
        ),
      );
      setSlots((previous) =>
        previous.map((slot) =>
          slot.id === body.booking.slot.id
            ? { ...slot, pendingCount: Math.max(0, slot.pendingCount - 1) }
            : slot,
        ),
      );
      setDeclineTarget(null);
      toast("Talep reddedildi; saat açık kaldı.", { tone: "success" });
      router.refresh();
    } catch (error) {
      setDeclineError(
        error instanceof ApiError ? error.message : "Talep reddedilemedi. Tekrar dene.",
      );
    } finally {
      setDeclinePending(false);
    }
  }

  async function handleAddSlot(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (slotPending) return;

    setSlotError(null);
    const startsAt = istanbulDateTimeToEpoch(date, time);
    if (startsAt === null) {
      setSlotError("Geçerli bir tarih ve saat seç.");
      return;
    }
    if (startsAt < Date.now() + 5 * 60_000) {
      setSlotError("Saat en az 5 dakika sonrası için olmalı.");
      return;
    }

    setSlotPending(true);
    try {
      const body = await apiFetch<{ slots: MentorSlotDto[] }>("/api/mentor/slots", {
        method: "POST",
        body: JSON.stringify({
          slots: [{ startsAt, durationMin: Number(duration) }],
        }),
      });
      setSlots((previous) =>
        [...previous, ...body.slots].sort((a, b) => a.startsAt - b.startsAt),
      );
      toast("Yeni saat eklendi.", { tone: "success" });
      router.refresh();
    } catch (error) {
      setSlotError(
        error instanceof ApiError ? error.message : "Saat eklenemedi. Tekrar dene.",
      );
    } finally {
      setSlotPending(false);
    }
  }

  function closeDelete(): void {
    if (deletePending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleDeleteSlot(): Promise<void> {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);

    try {
      await apiFetch<void>(`/api/mentor/slots/${deleteTarget.id}`, { method: "DELETE" });
      setSlots((previous) => previous.filter((slot) => slot.id !== deleteTarget.id));
      setBookings((previous) =>
        previous.filter((booking) => booking.slot.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast("Saat silindi.", { tone: "success" });
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof ApiError ? error.message : "Saat silinemedi. Tekrar dene.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-6">
        <section aria-labelledby="requests-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                className="text-lg font-semibold text-[color:var(--text)]"
                id="requests-title"
              >
                Gelen talepler
              </h2>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                Kabul ettiğinde saat dolu olur; aynı saatteki diğer bekleyen
                talepler otomatik reddedilir.
              </p>
            </div>
            <Badge tone={pendingRequests.length > 0 ? "warning" : "neutral"}>
              {pendingRequests.length} bekleyen
            </Badge>
          </div>

          {pendingRequests.length === 0 ? (
            <EmptyState
              className="mt-3"
              description="Öğrenciler açık saatlerine talep gönderdiğinde burada görünür."
              icon="users"
              title="Bekleyen talep yok"
            />
          ) : (
            <ul className="mt-3 space-y-3">
              {pendingRequests.map((booking) => {
                const studentName = displayName(booking.student.username);
                const accepting = action?.id === booking.id;
                return (
                  <li
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                    key={booking.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar name={studentName} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--text)]">
                            {studentName}
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                            {formatSlotDateTime(
                              booking.slot.startsAt,
                              booking.slot.durationMin,
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge tone="warning">Bekliyor</Badge>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[color:var(--muted)]">
                      {booking.message}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        disabled={action !== null}
                        onClick={() => {
                          setDeclineTarget(booking);
                          setDeclineError(null);
                        }}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Reddet
                      </Button>
                      <Button
                        loading={accepting}
                        disabled={action !== null && !accepting}
                        onClick={() => void handleAccept(booking)}
                        size="sm"
                        type="button"
                      >
                        Kabul et
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {history.length > 0 ? (
          <section aria-labelledby="history-title">
            <h2
              className="text-sm font-semibold text-[color:var(--text)]"
              id="history-title"
            >
              Geçmiş talepler
            </h2>
            <ul className="mt-2 divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
              {history.map((booking) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  key={booking.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[color:var(--text)]">
                      {displayName(booking.student.username)}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {formatSlotDateTime(booking.slot.startsAt, booking.slot.durationMin)}
                    </p>
                  </div>
                  <Badge tone={bookingTone(booking.status)}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <section
          aria-labelledby="add-slot-title"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
        >
          <h2 className="text-base font-semibold text-[color:var(--text)]" id="add-slot-title">
            Saat ekle
          </h2>
          <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
            Türkiye saatiyle (GMT+3) açık bir ders saati oluştur.
          </p>

          <form className="mt-4 space-y-3" noValidate onSubmit={handleAddSlot}>
            <Input
              id="slot-date"
              label="Tarih"
              min={todayIstanbulIso()}
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                id="slot-time"
                label="Başlangıç"
                onChange={(event) => setTime(event.target.value)}
                value={time}
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Select
                id="slot-duration"
                label="Süre"
                onChange={(event) => setDuration(event.target.value)}
                value={duration}
              >
                <option value="30">30 dk</option>
                <option value="45">45 dk</option>
                <option value="60">60 dk</option>
                <option value="90">90 dk</option>
                <option value="120">120 dk</option>
              </Select>
            </div>

            {slotError ? (
              <p
                className="rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-xs leading-5 text-[color:var(--danger-text)]"
                role="alert"
              >
                {slotError}
              </p>
            ) : null}

            <Button className="w-full" loading={slotPending} type="submit">
              <Icon name="plus" size={16} />
              Saat ekle
            </Button>
          </form>
        </section>

        <section
          aria-labelledby="my-slots-title"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[color:var(--text)]" id="my-slots-title">
              Saatlerin
            </h2>
            <Badge>{sortedSlots.length} saat</Badge>
          </div>

          {sortedSlots.length === 0 ? (
            <p className="mt-3 rounded-lg bg-[color:var(--elevated)] px-3 py-3 text-sm leading-6 text-[color:var(--muted)]">
              Henüz saat eklemedin. Yukarıdaki formdan ilk açık saati oluştur.
            </p>
          ) : (
            <ul className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {sortedSlots.map((slot) => (
                <li
                  className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
                  key={slot.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--text)]">
                        {formatLongDate(slot.startsAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {formatSlotRange(slot.startsAt, slot.durationMin)} ·{" "}
                        {slot.durationMin} dk
                      </p>
                    </div>
                    <Badge tone={slotTone(slot.status)}>
                      {SLOT_STATUS_LABELS[slot.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[color:var(--muted)]">
                      {slot.pendingCount > 0
                        ? `${slot.pendingCount} bekleyen talep`
                        : slot.status === "booked"
                          ? "Ders onaylandı"
                          : "Talep bekleniyor"}
                    </span>
                    {slot.status === "open" ? (
                      <button
                        aria-label={`${formatLongDate(slot.startsAt)} ${formatSlotTime(slot.startsAt)} saatini sil`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--muted)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger-text)]"
                        onClick={() => {
                          setDeleteTarget(slot);
                          setDeleteError(null);
                        }}
                        type="button"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {profile ? (
          <Link
            className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-medium text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
            href={`/mentorlar/${profile.id}`}
          >
            Herkese açık profilini gör
            <Icon name="arrow-right" size={15} />
          </Link>
        ) : null}
      </aside>

      <ConfirmDialog
        confirmLabel="Talebi reddet"
        description={
          declineTarget
            ? `${displayName(declineTarget.student.username)} · ${formatSlotDateTime(
                declineTarget.slot.startsAt,
                declineTarget.slot.durationMin,
              )}. Saat açık kalacak ve başka öğrenciler talep gönderebilir.`
            : ""
        }
        error={declineError}
        onClose={closeDecline}
        onConfirm={() => void handleDecline()}
        open={declineTarget !== null}
        pending={declinePending}
        title="Ders talebini reddet"
      />

      <ConfirmDialog
        confirmLabel="Saati sil"
        description={
          deleteTarget
            ? `${formatSlotDateTime(
                deleteTarget.startsAt,
                deleteTarget.durationMin,
              )} silinecek. Bu saat için bekleyen talepler de kapanır.`
            : ""
        }
        error={deleteError}
        onClose={closeDelete}
        onConfirm={() => void handleDeleteSlot()}
        open={deleteTarget !== null}
        pending={deletePending}
        title="Açık saati sil"
      />
    </div>
  );
}
