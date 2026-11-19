import {
  SLOT_LOOKAHEAD_DAYS,
  SLOT_MIN_LEAD_MS,
} from "../../shared/constants.js";
import type {
  BookingDto,
  BookingStatus,
  Exam,
  MentorDetail,
  MentorSlotDto,
  MentorSummary,
  SlotDto,
} from "../../shared/types.js";
import {
  validateBookingMessage,
  validateSlotBatch,
  validateSlotId,
  type Validated,
} from "../../shared/validation.js";
import type { AppDatabase } from "../db.js";
import { ApiError, forbidden, isUniqueViolation, notFound, validationError } from "../errors.js";
import { newId } from "../ids.js";
import {
  findBooking,
  insertBooking,
  listBookingsForMentor,
  listBookingsForStudent,
  type BookingRow,
} from "../repos/bookings.js";
import {
  findMentor,
  listMentors,
  type MentorRow,
} from "../repos/mentors.js";
import {
  deleteSlot,
  findNextOpenSlot,
  findSlot,
  insertSlot,
  listOpenSlotsForMentor,
  listSlotsForMentor,
  type MentorSlotRow,
  type SlotRow,
} from "../repos/slots.js";
import type { UserRow } from "../repos/users.js";

export interface MentorFilters {
  exam?: Exam;
  subject?: string;
  maxPrice?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function unwrap<T>(result: Validated<T>): T {
  if (!result.ok) throw validationError(result.error.field, result.error.message);
  return result.value;
}

function subjectsToArray(subjects: string): string[] {
  return subjects
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);
}

function toSlotDto(row: SlotRow): SlotDto {
  return {
    id: row.id,
    mentorId: row.mentor_id,
    startsAt: row.starts_at,
    durationMin: row.duration_min,
    status: row.status,
  };
}

function toMentorSlotDto(row: MentorSlotRow): MentorSlotDto {
  return { ...toSlotDto(row), pendingCount: row.pending_count };
}

function toMentorSummary(row: MentorRow, nextSlot: SlotRow | undefined): MentorSummary {
  return {
    id: row.id,
    username: row.username,
    headline: row.headline,
    university: row.university,
    department: row.department,
    exam: row.exam,
    score: row.score,
    subjects: subjectsToArray(row.subjects),
    priceTry: row.price_try,
    bio: row.bio,
    avatarColor: row.avatar_color,
    nextSlot: nextSlot
      ? {
          id: nextSlot.id,
          startsAt: nextSlot.starts_at,
          durationMin: nextSlot.duration_min,
        }
      : null,
  };
}

function toBookingDto(row: BookingRow): BookingDto {
  return {
    id: row.id,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    slot: {
      id: row.slot_id,
      mentorId: row.mentor_id,
      startsAt: row.slot_starts_at,
      durationMin: row.slot_duration_min,
      status: row.slot_status,
    },
    student: {
      id: row.student_id,
      username: row.student_username,
      avatarColor: null,
      headline: null,
      priceTry: null,
    },
    mentor: {
      id: row.mentor_id,
      username: row.mentor_username,
      avatarColor: row.mentor_avatar_color,
      headline: row.mentor_headline,
      priceTry: row.mentor_price_try,
    },
  };
}

function requireRole(user: UserRow, role: UserRow["role"], message: string): void {
  if (user.role !== role) throw forbidden(message);
}

export class MarketplaceService {
  constructor(private readonly db: AppDatabase) {}

  listMentors(filters: MentorFilters = {}, now: number = Date.now()): MentorSummary[] {
    const needle = filters.subject?.toLocaleLowerCase("tr-TR");

    return listMentors(this.db)
      .filter((row) => {
        if (filters.exam && row.exam !== filters.exam) return false;
        if (filters.maxPrice !== undefined && row.price_try > filters.maxPrice) return false;
        if (needle) {
          const subjects = subjectsToArray(row.subjects).map((subject) =>
            subject.toLocaleLowerCase("tr-TR"),
          );
          if (!subjects.some((subject) => subject.includes(needle))) return false;
        }
        return true;
      })
      .map((row) => toMentorSummary(row, findNextOpenSlot(this.db, row.id, now)));
  }

  getMentor(id: string, now: number = Date.now()): MentorDetail | null {
    const row = findMentor(this.db, id);
    if (!row) return null;

    const openSlots = listOpenSlotsForMentor(this.db, id, now);
    return {
      ...toMentorSummary(row, openSlots[0]),
      openSlots: openSlots.map(toSlotDto),
    };
  }

  createBooking(
    actor: UserRow,
    input: { slotId?: unknown; message?: unknown },
    now: number = Date.now(),
  ): BookingDto {
    requireRole(actor, "student", "Ders talebi yalnızca öğrenci hesaplarından gönderilebilir.");

    const slotId = unwrap(validateSlotId(input.slotId));
    const message = unwrap(validateBookingMessage(input.message));
    const slot = findSlot(this.db, slotId);

    if (!slot) throw notFound("Bu ders saati bulunamadı.");
    if (slot.status !== "open" || slot.starts_at <= now) {
      throw new ApiError(409, "SLOT_UNAVAILABLE", "Bu saat artık müsait değil.");
    }

    const bookingId = newId();
    try {
      insertBooking(this.db, {
        id: bookingId,
        slotId: slot.id,
        studentId: actor.id,
        mentorId: slot.mentor_id,
        message,
        createdAt: now,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(
          409,
          "BOOKING_EXISTS",
          "Bu saat için zaten bekleyen bir talebin var.",
        );
      }
      throw error;
    }

    const created = findBooking(this.db, bookingId);
    if (!created) throw new ApiError(500, "INTERNAL_ERROR", "Talep kaydedilemedi.");
    return toBookingDto(created);
  }

  listBookings(actor: UserRow): BookingDto[] {
    const rows =
      actor.role === "student"
        ? listBookingsForStudent(this.db, actor.id)
        : listBookingsForMentor(this.db, actor.id);
    return rows.map(toBookingDto);
  }

  acceptBooking(actor: UserRow, bookingId: string, now: number = Date.now()): BookingDto {
    requireRole(actor, "mentor", "Ders talebini yalnızca mentor kabul edebilir.");

    const booking = findBooking(this.db, bookingId);
    if (!booking) throw notFound("Ders talebi bulunamadı.");
    if (booking.mentor_id !== actor.id) throw forbidden("Bu talep sana ait değil.");
    if (booking.status !== "pending") {
      throw new ApiError(409, "INVALID_STATE", "Bu talep artık beklemede değil.");
    }
    if (booking.slot_status !== "open" || booking.slot_starts_at <= now) {
      throw new ApiError(409, "SLOT_UNAVAILABLE", "Bu saat artık müsait değil.");
    }

    this.db.transaction(() => {
      const claimed = this.db
        .prepare(
          "UPDATE availability_slots SET status = 'booked' WHERE id = ? AND status = 'open'",
        )
        .run(booking.slot_id);
      if (claimed.changes !== 1) {
        throw new ApiError(409, "SLOT_UNAVAILABLE", "Bu saat artık müsait değil.");
      }

      const accepted = this.db
        .prepare(
          "UPDATE bookings SET status = 'accepted', updated_at = ? WHERE id = ? AND status = 'pending'",
        )
        .run(now, booking.id);
      if (accepted.changes !== 1) {
        throw new ApiError(409, "INVALID_STATE", "Bu talep artık beklemede değil.");
      }

      // The slot is now full; competing requests must not stay pending.
      this.db
        .prepare(
          `UPDATE bookings
           SET status = 'declined', updated_at = ?
           WHERE slot_id = ? AND status = 'pending' AND id <> ?`,
        )
        .run(now, booking.slot_id, booking.id);
    })();

    const accepted = findBooking(this.db, booking.id);
    if (!accepted) throw new ApiError(500, "INTERNAL_ERROR", "Talep güncellenemedi.");
    return toBookingDto(accepted);
  }

  declineBooking(actor: UserRow, bookingId: string, now: number = Date.now()): BookingDto {
    requireRole(actor, "mentor", "Ders talebini yalnızca mentor reddedebilir.");

    const booking = findBooking(this.db, bookingId);
    if (!booking) throw notFound("Ders talebi bulunamadı.");
    if (booking.mentor_id !== actor.id) throw forbidden("Bu talep sana ait değil.");
    if (booking.status !== "pending") {
      throw new ApiError(409, "INVALID_STATE", "Bu talep artık beklemede değil.");
    }

    this.db.transaction(() => {
      this.db
        .prepare("UPDATE bookings SET status = 'declined', updated_at = ? WHERE id = ?")
        .run(now, booking.id);
      this.freeSlotIfUnclaimed(booking.slot_id);
    })();

    const declined = findBooking(this.db, booking.id);
    if (!declined) throw new ApiError(500, "INTERNAL_ERROR", "Talep güncellenemedi.");
    return toBookingDto(declined);
  }

  cancelBooking(actor: UserRow, bookingId: string, now: number = Date.now()): BookingDto {
    requireRole(actor, "student", "Ders talebini yalnızca öğrenci iptal edebilir.");

    const booking = findBooking(this.db, bookingId);
    if (!booking) throw notFound("Ders talebi bulunamadı.");
    if (booking.student_id !== actor.id) throw forbidden("Bu talep sana ait değil.");
    if (booking.status !== "pending" && booking.status !== "accepted") {
      throw new ApiError(409, "INVALID_STATE", "Bu talep artık iptal edilemez.");
    }

    const wasAccepted = booking.status === "accepted";

    this.db.transaction(() => {
      this.db
        .prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?")
        .run(now, booking.id);
      if (wasAccepted) this.freeSlotIfUnclaimed(booking.slot_id);
    })();

    const cancelled = findBooking(this.db, booking.id);
    if (!cancelled) throw new ApiError(500, "INTERNAL_ERROR", "Talep güncellenemedi.");
    return toBookingDto(cancelled);
  }

  createSlots(
    actor: UserRow,
    rawSlots: unknown,
    now: number = Date.now(),
  ): MentorSlotDto[] {
    requireRole(actor, "mentor", "Saat eklemek için mentor hesabı gerekli.");
    const inputs = unwrap(validateSlotBatch(rawSlots));
    const latest = now + SLOT_LOOKAHEAD_DAYS * DAY_MS;

    for (const input of inputs) {
      if (input.startsAt < now + SLOT_MIN_LEAD_MS) {
        throw validationError("startsAt", "Saat en az 5 dakika sonrası için olmalı.");
      }
      if (input.startsAt > latest) {
        throw validationError(
          "startsAt",
          `Saat en fazla ${SLOT_LOOKAHEAD_DAYS} gün sonrası için eklenebilir.`,
        );
      }
    }

    const created: MentorSlotDto[] = [];

    try {
      this.db.transaction(() => {
        for (const input of inputs) {
          created.push({
            id: newId(),
            mentorId: actor.id,
            startsAt: input.startsAt,
            durationMin: input.durationMin,
            status: "open",
            pendingCount: 0,
          });
        }

        for (const slot of created) {
          insertSlot(this.db, {
            id: slot.id,
            mentorId: actor.id,
            startsAt: slot.startsAt,
            durationMin: slot.durationMin,
          });
        }
      })();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(409, "SLOT_EXISTS", "Bu başlangıç saati zaten eklenmiş.");
      }
      throw error;
    }

    return created.sort((a, b) => a.startsAt - b.startsAt);
  }

  listMentorSlots(actor: UserRow): MentorSlotDto[] {
    requireRole(actor, "mentor", "Saatleri görmek için mentor hesabı gerekli.");
    return listSlotsForMentor(this.db, actor.id).map(toMentorSlotDto);
  }

  deleteMentorSlot(actor: UserRow, slotId: string): void {
    requireRole(actor, "mentor", "Saat silmek için mentor hesabı gerekli.");

    const slot = findSlot(this.db, slotId);
    if (!slot) throw notFound("Ders saati bulunamadı.");
    if (slot.mentor_id !== actor.id) throw forbidden("Bu saat sana ait değil.");
    if (slot.status !== "open") {
      throw new ApiError(409, "SLOT_BOOKED", "Dolu bir saat silinemez.");
    }

    deleteSlot(this.db, slot.id);
  }

  private freeSlotIfUnclaimed(slotId: string): void {
    this.db
      .prepare(
        `UPDATE availability_slots
         SET status = 'open'
         WHERE id = ? AND status = 'booked'
           AND NOT EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.slot_id = availability_slots.id AND b.status = 'accepted'
           )`,
      )
      .run(slotId);
  }
}

export function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    value === "pending" ||
    value === "accepted" ||
    value === "declined" ||
    value === "cancelled"
  );
}
