/** Shared, framework-free limits and stable identifiers. */

export const API_DEFAULT_PORT = 4500;
export const API_DEFAULT_HOST = "127.0.0.1";

export const SESSION_COOKIE_NAME = "rehber_session";
export const SESSION_TOKEN_BYTES = 32;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const CSRF_HEADER_NAME = "x-rehber-client";
export const CSRF_HEADER_VALUE = "web";
export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

export const MAX_BODY_BYTES = 64 * 1024;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const EMAIL_MAX_LENGTH = 254;

export const HEADLINE_MIN_LENGTH = 8;
export const HEADLINE_MAX_LENGTH = 120;
export const UNIVERSITY_MAX_LENGTH = 100;
export const DEPARTMENT_MAX_LENGTH = 100;
export const SCORE_MAX_LENGTH = 80;
export const BIO_MAX_LENGTH = 1200;
export const SUBJECT_MAX_LENGTH = 40;
export const SUBJECTS_PER_MENTOR_MAX = 8;
export const PRICE_MIN_TRY = 100;
export const PRICE_MAX_TRY = 5000;

export const BOOKING_MESSAGE_MIN_LENGTH = 10;
export const BOOKING_MESSAGE_MAX_LENGTH = 600;

export const SLOT_BATCH_MAX = 10;
export const SLOT_DURATION_MIN = 20;
export const SLOT_DURATION_MAX = 180;
export const SLOT_LOOKAHEAD_DAYS = 60;
export const SLOT_MIN_LEAD_MS = 5 * 60 * 1000;

export const SUBJECT_SUGGESTIONS = [
  "Matematik",
  "Geometri",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Türkçe",
  "Edebiyat",
  "Tarih",
  "Coğrafya",
  "İngilizce",
  "Fen Bilimleri",
  "Sosyal Bilgiler",
] as const;

export const EXAM_OPTIONS = [
  { value: "yks", label: "YKS" },
  { value: "lgs", label: "LGS" },
  { value: "ys", label: "YS" },
] as const;

export const DEFAULT_AVATAR_COLORS = [
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#1d4ed8",
  "#4d7c0f",
  "#a21caf",
  "#0e7490",
] as const;

export const SCRYPT_PARAMS = {
  N: 32768,
  r: 8,
  p: 1,
  keyLength: 64,
  maxmem: 64 * 1024 * 1024,
} as const;

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 60_000 },
  register: { limit: 10, windowMs: 60_000 },
  booking: { limit: 20, windowMs: 60_000 },
  slots: { limit: 30, windowMs: 60_000 },
} as const;
