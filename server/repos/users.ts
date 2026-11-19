import type { Role } from "../../shared/types.js";
import type { AppDatabase } from "../db.js";

export interface UserRow {
  id: string;
  username: string;
  username_key: string;
  email: string | null;
  password_hash: string;
  role: Role;
  created_at: number;
}

export interface InsertUserInput {
  id: string;
  username: string;
  usernameKey: string;
  email: string | null;
  passwordHash: string;
  role: Role;
  createdAt: number;
}

export function findUserByUsernameKey(
  db: AppDatabase,
  usernameKeyValue: string,
): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE username_key = ?")
    .get(usernameKeyValue) as UserRow | undefined;
}

export function findUserById(db: AppDatabase, id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function insertUser(db: AppDatabase, input: InsertUserInput): void {
  db.prepare(
    `INSERT INTO users
      (id, username, username_key, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.username,
    input.usernameKey,
    input.email,
    input.passwordHash,
    input.role,
    input.createdAt,
  );
}
