import type { SlotStatus } from "../../shared/types.js";
import type { AppDatabase } from "../db.js";

export interface SlotRow {
  id: string;
  mentor_id: string;
  starts_at: number;
  duration_min: number;
  status: SlotStatus;
}

export interface MentorSlotRow extends SlotRow {
  pending_count: number;
}

export function findSlot(db: AppDatabase, id: string): SlotRow | undefined {
  return db
    .prepare("SELECT * FROM availability_slots WHERE id = ?")
    .get(id) as SlotRow | undefined;
}

export function findNextOpenSlot(
  db: AppDatabase,
  mentorId: string,
  now: number,
): SlotRow | undefined {
  return db
    .prepare(
      `SELECT * FROM availability_slots
       WHERE mentor_id = ? AND status = 'open' AND starts_at > ?
       ORDER BY starts_at ASC
       LIMIT 1`,
    )
    .get(mentorId, now) as SlotRow | undefined;
}

export function listOpenSlotsForMentor(
  db: AppDatabase,
  mentorId: string,
  now: number,
): SlotRow[] {
  return db
    .prepare(
      `SELECT * FROM availability_slots
       WHERE mentor_id = ? AND status = 'open' AND starts_at > ?
       ORDER BY starts_at ASC`,
    )
    .all(mentorId, now) as SlotRow[];
}

export function listSlotsForMentor(
  db: AppDatabase,
  mentorId: string,
): MentorSlotRow[] {
  return db
    .prepare(
      `SELECT
         s.*,
         (SELECT COUNT(*) FROM bookings b
          WHERE b.slot_id = s.id AND b.status = 'pending') AS pending_count
       FROM availability_slots s
       WHERE s.mentor_id = ?
       ORDER BY s.starts_at ASC`,
    )
    .all(mentorId) as MentorSlotRow[];
}

export function insertSlot(
  db: AppDatabase,
  input: {
    id: string;
    mentorId: string;
    startsAt: number;
    durationMin: number;
    status?: SlotStatus;
  },
): void {
  db.prepare(
    `INSERT INTO availability_slots (id, mentor_id, starts_at, duration_min, status)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.mentorId,
    input.startsAt,
    input.durationMin,
    input.status ?? "open",
  );
}

export function deleteSlot(db: AppDatabase, id: string): void {
  db.prepare("DELETE FROM availability_slots WHERE id = ?").run(id);
}
