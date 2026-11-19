import {
  BIO_MAX_LENGTH,
  BOOKING_MESSAGE_MAX_LENGTH,
  BOOKING_MESSAGE_MIN_LENGTH,
  DEPARTMENT_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  HEADLINE_MAX_LENGTH,
  HEADLINE_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PRICE_MAX_TRY,
  PRICE_MIN_TRY,
  SCORE_MAX_LENGTH,
  SLOT_BATCH_MAX,
  SLOT_DURATION_MAX,
  SLOT_DURATION_MIN,
  SUBJECT_MAX_LENGTH,
  SUBJECTS_PER_MENTOR_MAX,
  UNIVERSITY_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "./constants";
import type { Exam, Role } from "./types";

export interface FieldIssue {
  field: string;
  message: string;
}

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: FieldIssue };

export interface MentorProfileInput {
  headline: string;
  university: string;
  department: string;
  exam: Exam;
  score: string;
  subjects: string[];
  priceTry: number;
  bio: string;
  avatarColor?: string;
}

export interface SlotInput {
  startsAt: number;
  durationMin: number;
}

export const USERNAME_PATTERN = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9_]+$/u;
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function ok<T>(value: T): Validated<T> {
  return { ok: true, value };
}

function fail<T>(field: string, message: string): Validated<T> {
  return { ok: false, error: { field, message } };
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.normalize("NFC").trim() : null;
}

export function normalizeUsername(value: string): string {
  return value.normalize("NFC").trim();
}

export function usernameKey(value: string): string {
  return normalizeUsername(value).toLocaleLowerCase("tr-TR");
}

export function validateUsername(value: unknown): Validated<string> {
  if (typeof value !== "string") {
    return fail("username", "Kullanıcı adı gerekli.");
  }

  const normalized = normalizeUsername(value);
  if (
    normalized.length < USERNAME_MIN_LENGTH ||
    normalized.length > USERNAME_MAX_LENGTH
  ) {
    return fail(
      "username",
      `Kullanıcı adı ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} karakter olmalı.`,
    );
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return fail(
      "username",
      "Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.",
    );
  }

  return ok(normalized);
}

export function validatePassword(value: unknown): Validated<string> {
  if (typeof value !== "string") {
    return fail("password", "Şifre gerekli.");
  }

  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return fail(
      "password",
      `Şifre ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} karakter olmalı.`,
    );
  }

  return ok(value);
}

export function validateEmail(value: unknown): Validated<string | null> {
  if (value === undefined || value === null || value === "") {
    return ok(null);
  }

  if (typeof value !== "string") {
    return fail("email", "E-posta metin olmalı.");
  }

  const trimmed = value.trim();
  if (trimmed === "") return ok(null);

  if (trimmed.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(trimmed)) {
    return fail("email", "Geçerli bir e-posta adresi gir.");
  }

  return ok(trimmed);
}

export function validateRole(value: unknown): Validated<Role> {
  if (value === "student" || value === "mentor") return ok(value);
  return fail("role", "Hesap türü öğrenci veya mentor olmalı.");
}

export function validateExam(value: unknown): Validated<Exam> {
  if (value === "ys" || value === "yks" || value === "lgs") return ok(value);
  return fail("exam", "Sınav türü YKS, LGS veya YS olmalı.");
}

export function validateSubjects(value: unknown): Validated<string[]> {
  const raw =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value
        : null;

  if (!raw) return fail("subjects", "En az bir ders seç.");

  const subjects: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (typeof item !== "string") {
      return fail("subjects", "Dersler metin olmalı.");
    }
    const subject = item.normalize("NFC").trim();
    if (!subject) continue;
    if (subject.length > SUBJECT_MAX_LENGTH) {
      return fail("subjects", `Her ders en fazla ${SUBJECT_MAX_LENGTH} karakter olabilir.`);
    }
    const key = subject.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    subjects.push(subject);
  }

  if (subjects.length === 0) {
    return fail("subjects", "En az bir ders gir.");
  }
  if (subjects.length > SUBJECTS_PER_MENTOR_MAX) {
    return fail("subjects", `En fazla ${SUBJECTS_PER_MENTOR_MAX} ders ekleyebilirsin.`);
  }

  return ok(subjects);
}

export function validateMentorProfile(value: unknown): Validated<MentorProfileInput> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("mentorProfile", "Mentor profili gerekli.");
  }
  const record = value as Record<string, unknown>;

  const headline = asTrimmedString(record.headline);
  if (!headline || headline.length < HEADLINE_MIN_LENGTH || headline.length > HEADLINE_MAX_LENGTH) {
    return fail(
      "headline",
      `Kısa tanıtım ${HEADLINE_MIN_LENGTH}–${HEADLINE_MAX_LENGTH} karakter olmalı.`,
    );
  }

  const university = asTrimmedString(record.university);
  if (!university || university.length < 2 || university.length > UNIVERSITY_MAX_LENGTH) {
    return fail("university", "Okul adı 2–100 karakter olmalı.");
  }

  const department = asTrimmedString(record.department);
  if (!department || department.length < 2 || department.length > DEPARTMENT_MAX_LENGTH) {
    return fail("department", "Bölüm 2–100 karakter olmalı.");
  }

  const exam = validateExam(record.exam);
  if (!exam.ok) return exam;

  const score = asTrimmedString(record.score);
  if (!score || score.length < 2 || score.length > SCORE_MAX_LENGTH) {
    return fail("score", "Derece bilgisi 2–80 karakter olmalı.");
  }

  const subjects = validateSubjects(record.subjects);
  if (!subjects.ok) return subjects;

  if (
    typeof record.priceTry !== "number" ||
    !Number.isInteger(record.priceTry) ||
    record.priceTry < PRICE_MIN_TRY ||
    record.priceTry > PRICE_MAX_TRY
  ) {
    return fail("priceTry", `Ders ücreti ${PRICE_MIN_TRY}–${PRICE_MAX_TRY} TL arasında olmalı.`);
  }

  const bio = typeof record.bio === "string" ? record.bio.normalize("NFC").trim() : "";
  if (bio.length > BIO_MAX_LENGTH) {
    return fail("bio", `Uzun tanıtım en fazla ${BIO_MAX_LENGTH} karakter olabilir.`);
  }

  let avatarColor: string | undefined;
  if (record.avatarColor !== undefined && record.avatarColor !== null) {
    if (typeof record.avatarColor !== "string" || !HEX_COLOR_PATTERN.test(record.avatarColor)) {
      return fail("avatarColor", "Renk #RRGGBB biçiminde olmalı.");
    }
    avatarColor = record.avatarColor;
  }

  return ok({
    headline,
    university,
    department,
    exam: exam.value,
    score,
    subjects: subjects.value,
    priceTry: record.priceTry,
    bio,
    ...(avatarColor ? { avatarColor } : {}),
  });
}

export function validateBookingMessage(value: unknown): Validated<string> {
  if (typeof value !== "string") {
    return fail("message", "Mentora kısa bir not yaz.");
  }

  const message = value.normalize("NFC").trim();
  if (message.length < BOOKING_MESSAGE_MIN_LENGTH) {
    return fail("message", `Not en az ${BOOKING_MESSAGE_MIN_LENGTH} karakter olmalı.`);
  }
  if (message.length > BOOKING_MESSAGE_MAX_LENGTH) {
    return fail("message", `Not en fazla ${BOOKING_MESSAGE_MAX_LENGTH} karakter olabilir.`);
  }

  return ok(message);
}

export function validateSlotId(value: unknown): Validated<string> {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    return fail("slotId", "Saat seçimi geçersiz.");
  }
  return ok(value);
}

export function validateStartsAt(value: unknown): Validated<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return fail("startsAt", "Başlangıç zamanı geçersiz.");
  }
  return ok(value);
}

export function validateDurationMin(value: unknown): Validated<number> {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < SLOT_DURATION_MIN ||
    value > SLOT_DURATION_MAX ||
    value % 5 !== 0
  ) {
    return fail(
      "durationMin",
      `Süre ${SLOT_DURATION_MIN}–${SLOT_DURATION_MAX} dakika arasında olmalı.`,
    );
  }
  return ok(value);
}

export function validateSlotBatch(value: unknown): Validated<SlotInput[]> {
  if (!Array.isArray(value) || value.length < 1 || value.length > SLOT_BATCH_MAX) {
    return fail("slots", `Bir seferde 1–${SLOT_BATCH_MAX} saat ekleyebilirsin.`);
  }

  const slots: SlotInput[] = [];
  const seen = new Set<number>();

  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return fail("slots", "Saat bilgisi geçersiz.");
    }
    const record = item as Record<string, unknown>;
    const startsAt = validateStartsAt(record.startsAt);
    if (!startsAt.ok) return startsAt;
    const durationMin = validateDurationMin(record.durationMin);
    if (!durationMin.ok) return durationMin;

    if (seen.has(startsAt.value)) {
      return fail("slots", "Aynı başlangıç saati birden fazla kez eklenemez.");
    }
    seen.add(startsAt.value);
    slots.push({ startsAt: startsAt.value, durationMin: durationMin.value });
  }

  return ok(slots);
}

export function validateExamFilter(value: unknown): Validated<Exam | undefined> {
  if (value === undefined || value === null || value === "") return ok(undefined);
  return validateExam(value);
}

export function validateSubjectFilter(value: unknown): Validated<string | undefined> {
  if (value === undefined || value === null || value === "") return ok(undefined);
  if (typeof value !== "string") return fail("subject", "Ders filtresi geçersiz.");

  const subject = value.normalize("NFC").trim();
  if (subject.length === 0) return ok(undefined);
  if (subject.length > SUBJECT_MAX_LENGTH) {
    return fail("subject", "Ders filtresi çok uzun.");
  }
  return ok(subject);
}

export function validateMaxPrice(value: unknown): Validated<number | undefined> {
  if (value === undefined || value === null || value === "") return ok(undefined);

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > PRICE_MAX_TRY) {
    return fail("maxPrice", "En yüksek ücret geçersiz.");
  }
  return ok(parsed);
}

export function isPlausibleId(value: string): boolean {
  return ID_PATTERN.test(value);
}
