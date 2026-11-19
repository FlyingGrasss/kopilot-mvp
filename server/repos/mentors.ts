import type { Exam } from "../../shared/types.js";
import type { AppDatabase } from "../db.js";

export interface MentorRow {
  id: string;
  username: string;
  headline: string;
  university: string;
  department: string;
  exam: Exam;
  score: string;
  subjects: string;
  price_try: number;
  bio: string;
  avatar_color: string;
}

export interface InsertMentorProfileInput {
  userId: string;
  headline: string;
  university: string;
  department: string;
  exam: Exam;
  score: string;
  subjects: string[];
  priceTry: number;
  bio: string;
  avatarColor: string;
}

const MENTOR_SELECT = `
  SELECT
    u.id,
    u.username,
    p.headline,
    p.university,
    p.department,
    p.exam,
    p.score,
    p.subjects,
    p.price_try,
    p.bio,
    p.avatar_color
  FROM users u
  JOIN mentor_profiles p ON p.user_id = u.id
`;

export function listMentors(db: AppDatabase): MentorRow[] {
  return db
    .prepare(`${MENTOR_SELECT} WHERE u.role = 'mentor' ORDER BY u.created_at ASC, u.username ASC`)
    .all() as MentorRow[];
}

export function findMentor(db: AppDatabase, id: string): MentorRow | undefined {
  return db
    .prepare(`${MENTOR_SELECT} WHERE u.id = ? AND u.role = 'mentor'`)
    .get(id) as MentorRow | undefined;
}

export function insertMentorProfile(
  db: AppDatabase,
  input: InsertMentorProfileInput,
): void {
  db.prepare(
    `INSERT INTO mentor_profiles
      (user_id, headline, university, department, exam, score, subjects, price_try, bio, avatar_color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.userId,
    input.headline,
    input.university,
    input.department,
    input.exam,
    input.score,
    input.subjects.join(", "),
    input.priceTry,
    input.bio,
    input.avatarColor,
  );
}
