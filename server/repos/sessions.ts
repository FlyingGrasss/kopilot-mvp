import type { AppDatabase } from "../db.js";
import type { UserRow } from "./users.js";

export interface SessionJoinRow {
  sessionId: string;
  user: UserRow;
}

export interface InsertSessionInput {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
}

export function insertSession(db: AppDatabase, input: InsertSessionInput): void {
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(input.id, input.userId, input.tokenHash, input.createdAt, input.expiresAt);
}

export function findSessionByTokenHash(
  db: AppDatabase,
  tokenHash: string,
  now: number,
): SessionJoinRow | undefined {
  const row = db
    .prepare(
      `SELECT
         s.id AS session_id,
         u.id AS user_id,
         u.username,
         u.username_key,
         u.email,
         u.password_hash,
         u.role,
         u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(tokenHash, now) as
    | {
        session_id: string;
        user_id: string;
        username: string;
        username_key: string;
        email: string | null;
        password_hash: string;
        role: UserRow["role"];
        created_at: number;
      }
    | undefined;

  if (!row) return undefined;

  return {
    sessionId: row.session_id,
    user: {
      id: row.user_id,
      username: row.username,
      username_key: row.username_key,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      created_at: row.created_at,
    },
  };
}

export function deleteSessionByTokenHash(db: AppDatabase, tokenHash: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function deleteExpiredSessions(db: AppDatabase, now: number): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
}
