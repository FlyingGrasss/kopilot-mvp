"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { MentorDetail, SlotDto, UserDto } from "@shared/types";
import {
  BOOKING_MESSAGE_MAX_LENGTH,
  BOOKING_MESSAGE_MIN_LENGTH,
} from "@shared/constants";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toaster";
import { apiFetch, ApiError } from "@/lib/api";
import {
  displayName,
  formatPrice,
  formatSlotDate,
  formatSlotDateTime,
  formatSlotRange,
  formatSlotTime,
  istanbulDateKey,
} from "@/lib/format";

export interface SlotPickerProps {
  mentor: MentorDetail;
  slots: SlotDto[];
  viewer: UserDto | null;
  loginHref: string;
}

export function SlotPicker({ mentor, slots, viewer, loginHref }: SlotPickerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  const groups = useMemo(() => {
    const sorted = [...slots].sort((a, b) => a.startsAt - b.startsAt);
    const map = new Map<string, SlotDto[]>();
    for (const slot of sorted) {
      const key = istanbulDateKey(slot.startsAt);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [slots]);

  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const selectedRequested = selected ? requestedIds.includes(selected.id) : false;
  const mentorName = displayName(mentor.username);

  if (slots.length === 0) {
    return (
      <EmptyState
        description="Mentor yeni saatler eklediğinde burada görünecek."
        icon="calendar"
        title="Şu an açık saat yok"
      />
    );
  }

  const canBook = viewer?.role === "student";

  function openModal(): void {
    if (!selected || !canBook || selectedRequested) return;
    setFieldError(null);
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal(): void {
    if (pending) return;
    setModalOpen(false);
    setFieldError(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || !selected) return;

    const trimmed = message.trim();
    if (trimmed.length < BOOKING_MESSAGE_MIN_LENGTH) {
      setFieldError(`Not en az ${BOOKING_MESSAGE_MIN_LENGTH} karakter olmalı.`);
      return;
    }

    setFieldError(null);
    setFormError(null);
    setPending(true);

    try {
      await apiFetch<{ booking: unknown }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ slotId: selected.id, message: trimmed }),
      });

      setRequestedIds((previous) =>
        previous.includes(selected.id) ? previous : [...previous, selected.id],
      );
      setModalOpen(false);
      setMessage("");
      toast("Ders talebin gönderildi. Mentor yanıtladığında panelinde göreceksin.", {
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "BOOKING_EXISTS") {
          setFormError("Bu saat için zaten bekleyen bir talebin var.");
        } else if (error.code === "SLOT_UNAVAILABLE") {
          setFormError("Bu saat artık müsait değil. Sayfayı yenileyip başka bir saat seç.");
          router.refresh();
        } else if (error.status === 401) {
          setFormError("Oturumun sona ermiş. Giriş yapıp tekrar dene.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Talep gönderilemedi. Tekrar dene.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="space-y-5">
        {groups.map(([dateKey, daySlots]) => (
          <section aria-label={`${formatSlotDate(daySlots[0]!.startsAt)} uygun saatleri`} key={dateKey}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              {formatSlotDate(daySlots[0]!.startsAt)}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {daySlots.map((slot) => {
                const isSelected = slot.id === selectedId;
                const isRequested = requestedIds.includes(slot.id);
                return (
                  <button
                    aria-pressed={isSelected}
                    className={
                      isRequested
                        ? "flex flex-col items-start rounded-lg border border-[color:var(--border)] bg-[color:var(--elevated)] px-3 py-2 text-left text-[color:var(--muted)]"
                        : isSelected
                          ? "flex flex-col items-start rounded-lg border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-2 text-left text-[color:var(--text)]"
                          : "flex flex-col items-start rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-left text-[color:var(--text)] transition-colors hover:border-[color:var(--border-strong)]"
                    }
                    disabled={isRequested}
                    key={slot.id}
                    onClick={() => setSelectedId(slot.id)}
                    type="button"
                  >
                    <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold">
                      {formatSlotTime(slot.startsAt)}
                      {isSelected ? <Icon name="check" size={14} /> : null}
                    </span>
                    <span className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                      {isRequested
                        ? "Talep gönderildi"
                        : `${slot.durationMin} dk · ${formatSlotRange(slot.startsAt, slot.durationMin)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-5 border-t border-[color:var(--border)] pt-4">
        {!viewer ? (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Saat seçtikten sonra talep göndermek için giriş yapman gerekiyor.
            </p>
            <a
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)]"
              href={loginHref}
            >
              Talep için giriş yap
              <Icon name="arrow-right" size={16} />
            </a>
          </div>
        ) : viewer.role === "mentor" ? (
          <p className="rounded-lg bg-[color:var(--elevated)] px-3 py-2.5 text-sm leading-6 text-[color:var(--muted)]">
            Mentor hesabıyla ders talebi gönderemezsin. Öğrencilerin taleplerini
            panelinden yönetebilirsin.
          </p>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full"
              disabled={!selected || selectedRequested}
              onClick={openModal}
              type="button"
            >
              {selectedRequested
                ? "Bu saat için talebin gönderildi"
                : selected
                  ? `${formatSlotDate(selected.startsAt)} · ${formatSlotTime(selected.startsAt)} için talep gönder`
                  : "Önce bir saat seç"}
            </Button>
            <p className="text-xs leading-5 text-[color:var(--muted)]">
              Talep gönderdiğinde saat hemen kapanmaz. Mentor kabul edene kadar
              diğer taleplere açık kalır.
            </p>
          </div>
        )}
      </div>

      <Modal
        description={`${mentorName} · ${selected ? formatSlotDateTime(selected.startsAt, selected.durationMin) : ""}`}
        dismissible={!pending}
        footer={
          <>
            <Button disabled={pending} onClick={closeModal} type="button" variant="secondary">
              Vazgeç
            </Button>
            <Button loading={pending} form="booking-form" type="submit">
              Talebi gönder
            </Button>
          </>
        }
        onOpenChange={(next) => {
          if (!next) closeModal();
        }}
        open={modalOpen}
        size="md"
        title="Ders talebi gönder"
      >
        <form className="space-y-4" id="booking-form" noValidate onSubmit={handleSubmit}>
          {selected ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--elevated)] px-3 py-2.5">
              <p className="text-sm font-medium text-[color:var(--text)]">
                {formatSlotDateTime(selected.startsAt, selected.durationMin)}
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Ders ücreti: {formatPrice(mentor.priceTry)} · Ödeme v1&apos;de yok
              </p>
            </div>
          ) : null}

          <Textarea
            data-autofocus
            disabled={pending}
            error={fieldError ?? undefined}
            hint={`${BOOKING_MESSAGE_MIN_LENGTH}–${BOOKING_MESSAGE_MAX_LENGTH} karakter. Hangi konuda çalışmak istediğini yaz.`}
            id="booking-message"
            label="Mentora notun"
            maxLength={BOOKING_MESSAGE_MAX_LENGTH}
            onChange={(event) => {
              setMessage(event.target.value);
              if (fieldError) setFieldError(null);
            }}
            placeholder="Örn. Türev konusunda eksiklerim var; ilk derste seviyemi ölçüp plan çıkarabilir miyiz?"
            required
            value={message}
          />

          {formError ? (
            <p
              className="rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm leading-5 text-[color:var(--danger-text)]"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
