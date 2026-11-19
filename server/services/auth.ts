import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import {
  DEFAULT_AVATAR_COLORS,
  SESSION_TOKEN_BYTES,
  SESSION_TTL_MS,
  SCRYPT_PARAMS,
} from "../../shared/constants.js";
import type { Role, UserDto } from "../../shared/types.js";
import {
  usernameKey,
  validateEmail,
  validateMentorProfile,
  validatePassword,
  validateRole,
  validateUsername,
  type Validated,
} from "../../shared/validation.js";
import type { AppDatabase } from "../db.js";
import { ApiError, isUniqueViolation, validationError } from "../errors.js";
import { newId, newOpaqueToken, pickAvatarColor, sha256Hex } from "../ids.js";
import { insertMentorProfile } from "../repos/mentors.js";
import {
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  insertSession,
} from "../repos/sessions.js";
import {
  findUserByUsernameKey,
  insertUser,
  type UserRow,
} from "../repos/users.js";

export interface AuthContext {
  sessionId: string;
  user: UserRow;
}

export interface AuthResult {
  user: UserDto;
  token: string;
  expiresAt: number;
}

interface ScryptDetails {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

const DUMMY_SALT = Buffer.alloc(16);
const DUMMY_HASH = `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${DUMMY_SALT.toString("base64url")}$${Buffer.alloc(SCRYPT_PARAMS.keyLength).toString("base64url")}`;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      {
        N: options.N,
        r: options.r,
        p: options.p,
        maxmem: SCRYPT_PARAMS.maxmem,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

function parseStoredHash(stored: string): ScryptDetails | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? "", "base64url");
  const hash = Buffer.from(parts[5] ?? "", "base64url");

  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N <= 1 ||
    r < 1 ||
    p < 1 ||
    salt.length < 8 ||
    hash.length === 0
  ) {
    return null;
  }

  return { N, r, p, salt, hash };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt, SCRYPT_PARAMS.keyLength, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const details = parseStoredHash(stored);
  if (!details) return false;

  const derived = await deriveKey(password, details.salt, details.hash.length, details);
  if (derived.length !== details.hash.length) return false;
  return timingSafeEqual(derived, details.hash);
}

function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.created_at,
  };
}

function unwrap<T>(result: Validated<T>): T {
  if (!result.ok) throw validationError(result.error.field, result.error.message);
  return result.value;
}

export interface RegisterInput {
  username?: unknown;
  password?: unknown;
  email?: unknown;
  role?: unknown;
  mentorProfile?: unknown;
}

export class AuthService {
  constructor(private readonly db: AppDatabase) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const username = unwrap(validateUsername(input.username));
    const password = unwrap(validatePassword(input.password));
    const email = unwrap(validateEmail(input.email));
    const role: Role = unwrap(validateRole(input.role));
    const mentorProfile =
      role === "mentor" ? unwrap(validateMentorProfile(input.mentorProfile)) : null;
    const key = usernameKey(username);

    if (findUserByUsernameKey(this.db, key)) {
      throw new ApiError(409, "USERNAME_TAKEN", "Bu kullanıcı adı zaten alınmış.");
    }

    const passwordHash = await hashPassword(password);
    const now = Date.now();
    const user: UserRow = {
      id: newId(),
      username,
      username_key: key,
      email,
      password_hash: passwordHash,
      role,
      created_at: now,
    };
    const session = this.newSession(user, now);

    try {
      this.db.transaction(() => {
        deleteExpiredSessions(this.db, now);
        insertUser(this.db, {
          id: user.id,
          username: user.username,
          usernameKey: user.username_key,
          email: user.email,
          passwordHash: user.password_hash,
          role: user.role,
          createdAt: user.created_at,
        });

        if (mentorProfile) {
          insertMentorProfile(this.db, {
            userId: user.id,
            headline: mentorProfile.headline,
            university: mentorProfile.university,
            department: mentorProfile.department,
            exam: mentorProfile.exam,
            score: mentorProfile.score,
            subjects: mentorProfile.subjects,
            priceTry: mentorProfile.priceTry,
            bio: mentorProfile.bio,
            avatarColor:
              mentorProfile.avatarColor ??
              pickAvatarColor(user.id, DEFAULT_AVATAR_COLORS),
          });
        }

        insertSession(this.db, session.row);
      })();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(409, "USERNAME_TAKEN", "Bu kullanıcı adı zaten alınmış.");
      }
      throw error;
    }

    return { user: toUserDto(user), token: session.token, expiresAt: session.expiresAt };
  }

  async login(input: { username?: unknown; password?: unknown }): Promise<AuthResult> {
    const username = unwrap(validateUsername(input.username));
    const password = unwrap(validatePassword(input.password));

    const user = findUserByUsernameKey(this.db, usernameKey(username));

    // Always execute scrypt so unknown users and registered users cost the
    // same amount of work and do not leak account existence through timing.
    const storedHash = user?.password_hash ?? DUMMY_HASH;
    const passwordMatches = await verifyPassword(password, storedHash);

    if (!user || !passwordMatches) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Kullanıcı adı veya şifre hatalı.");
    }

    const now = Date.now();
    const session = this.newSession(user, now);

    this.db.transaction(() => {
      deleteExpiredSessions(this.db, now);
      insertSession(this.db, session.row);
    })();

    return { user: toUserDto(user), token: session.token, expiresAt: session.expiresAt };
  }

  logout(token: string | null): void {
    if (!token) return;
    deleteSessionByTokenHash(this.db, sha256Hex(token));
  }

  resolveSession(token: string | null, now: number = Date.now()): AuthContext | null {
    if (!token) return null;

    const session = findSessionByTokenHash(this.db, sha256Hex(token), now);
    if (!session) return null;

    return { sessionId: session.sessionId, user: session.user };
  }

  private newSession(user: UserRow, now: number) {
    const token = newOpaqueToken(SESSION_TOKEN_BYTES);
    const expiresAt = now + SESSION_TTL_MS;

    return {
      token,
      expiresAt,
      row: {
        id: newId(),
        userId: user.id,
        tokenHash: sha256Hex(token),
        createdAt: now,
        expiresAt,
      },
    };
  }
}

export function toPublicUser(user: UserRow): UserDto {
  return toUserDto(user);
}
