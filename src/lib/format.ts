import type { BookingStatus, Exam, SlotStatus } from "@shared/types";

const ISTANBUL = "Europe/Istanbul";
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL,
  weekday: "short",
  day: "numeric",
  month: "long",
});

const longDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL,
  hour: "2-digit",
  minute: "2-digit",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 0,
});

export function initials(name: string): string {
  const parts = name
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return Array.from(parts[0]!).slice(0, 2).join("").toLocaleUpperCase("tr-TR");
  }
  return `${Array.from(parts[0]!)[0] ?? ""}${Array.from(parts[1]!)[0] ?? ""}`.toLocaleUpperCase(
    "tr-TR",
  );
}

/** Seed usernames use underscores; this keeps cards looking like real names. */
export function displayName(username: string): string {
  const formatted = username
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return formatted
    .split(" ")
    .map((part) =>
      part.length > 0
        ? `${part.slice(0, 1).toLocaleUpperCase("tr-TR")}${part.slice(1)}`
        : part,
    )
    .join(" ");
}

export function examLabel(exam: Exam): string {
  return exam === "yks" ? "YKS" : exam === "lgs" ? "LGS" : "YS";
}

export function formatPrice(priceTry: number): string {
  return `${priceFormatter.format(priceTry)} TL`;
}

export function formatSlotDate(startsAt: number): string {
  return dateFormatter.format(new Date(startsAt));
}

export function formatLongDate(startsAt: number): string {
  return longDateFormatter.format(new Date(startsAt));
}

export function formatSlotTime(startsAt: number): string {
  return timeFormatter.format(new Date(startsAt));
}

export function formatSlotRange(startsAt: number, durationMin: number): string {
  return `${formatSlotTime(startsAt)}–${formatSlotTime(startsAt + durationMin * 60_000)}`;
}

export function formatSlotDateTime(startsAt: number, durationMin: number): string {
  return `${formatSlotDate(startsAt)} · ${formatSlotRange(startsAt, durationMin)}`;
}

/** Stable `YYYY-MM-DD` key in Türkiye time for grouping slots. */
export function istanbulDateKey(timestamp: number): string {
  return dateKeyFormatter.format(new Date(timestamp));
}

export function todayIstanbulIso(now: number = Date.now()): string {
  return istanbulDateKey(now);
}

/** Converts an `YYYY-MM-DD` + `HH:mm` Türkiye wall-clock pair to epoch ms. */
export function istanbulDateTimeToEpoch(date: string, time: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/u.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (hour > 23 || minute > 59) return null;

  const epoch =
    Date.UTC(year, month - 1, day, hour, minute, 0, 0) - ISTANBUL_OFFSET_MS;
  const local = new Date(epoch + ISTANBUL_OFFSET_MS);

  if (
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() !== month - 1 ||
    local.getUTCDate() !== day ||
    local.getUTCHours() !== hour ||
    local.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return epoch;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Bekliyor",
  accepted: "Kabul edildi",
  declined: "Reddedildi",
  cancelled: "İptal edildi",
};

export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  open: "Açık",
  booked: "Dolu",
};
