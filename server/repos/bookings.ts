import type { BookingStatus, SlotStatus } from "../../shared/types.js";
import type { AppDatabase } from "../db.js";

export interface BookingRow {
  id: string;
  slot_id: string;
  student_id: string;
  mentor_id: string;
  status: BookingStatus;
  message: string;
  created_at: number;
  updated_at: number;
  slot_starts_at: number;
  slot_duration_min: number;
  slot_status: SlotStatus;
  student_username: string;
  mentor_username: string;
  mentor_avatar_color: string | null;
  mentor_headline: string | null;
  mentor_price_try: number | null;
}

const BOOKING_SELECT = `
  SELECT
    b.*,
    s.starts_at AS slot_starts_at,
    s.duration_min AS slot_duration_min,
    s.status AS slot_status,
    su.username AS student_username,
    mu.username AS mentor_username,
    mp.avatar_color AS mentor_avatar_color,
    mp.headline AS mentor_headline,
    mp.price_try AS mentor_price_try
  FROM bookings b
  JOIN availability_slots s ON s.id = b.slot_id
  JOIN users su ON su.id = b.student_id
  JOIN users mu ON mu.id = b.mentor_id
  LEFT JOIN mentor_profiles mp ON mp.user_id = b.mentor_id
`;

export function findBooking(db: AppDatabase, id: string): BookingRow | undefined {
  return db
    .prepare(`${BOOKING_SELECT} WHERE b.id = ?`)
    .get(id) as BookingRow | undefined;
}

export function listBookingsForStudent(
  db: AppDatabase,
  studentId: string,
): BookingRow[] {
  return db
    .prepare(
      `${BOOKING_SELECT}
       WHERE b.student_id = ?
       ORDER BY
         CASE WHEN b.status IN ('pending', 'accepted') THEN 0 ELSE 1 END,
         s.starts_at ASC`,
    )
    .all(studentId) as BookingRow[];
}

export function listBookingsForMentor(
  db: AppDatabase,
  mentorId: string,
): BookingRow[] {
  return db
    .prepare(
      `${BOOKING_SELECT}
       WHERE b.mentor_id = ?
       ORDER BY
         CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END,
         s.starts_at ASC`,
    )
    .all(mentorId) as BookingRow[];
}

export function insertBooking(
  db: AppDatabase,
  input: {
    id: string;
    slotId: string;
    studentId: string;
    mentorId: string;
    message: string;
    createdAt: number;
  },
): void {
  db.prepare(
    `INSERT INTO bookings
      (id, slot_id, student_id, mentor_id, status, message, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(
    input.id,
    input.slotId,
    input.studentId,
    input.mentorId,
    input.message,
    input.createdAt,
    input.createdAt,
  );
}
