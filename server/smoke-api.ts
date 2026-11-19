import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SESSION_COOKIE_NAME } from "../shared/constants.js";
import type {
  AuthResponse,
  BookingDto,
  BookingListResponse,
  MentorDetailResponse,
  MentorListResponse,
  MentorSlotListResponse,
  UserDto,
} from "../shared/types.js";
import { createApp } from "./app.js";
import type { AppContext } from "./context.js";
import { createContext } from "./context.js";

const TEST_ORIGIN = "http://localhost:3000";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

interface ApiResult {
  status: number;
  data: unknown;
  setCookie: string | null;
  cookie: string | null;
  headers: Headers;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  rawBody?: string;
  cookie?: string | null;
  headers?: Record<string, string>;
  omitClient?: boolean;
  origin?: string | null;
  contentType?: string;
}

function ensure(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
}

function errorCode(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";
  const error = (data as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function cookieMaxAge(setCookie: string | null): number {
  const match = /Max-Age=(\d+)/i.exec(setCookie ?? "");
  return match ? Number(match[1]) : 0;
}

function futureSlot(dayOffset: number, hour: number): number {
  return Math.ceil((Date.now() + dayOffset * DAY + hour * HOUR) / HOUR) * HOUR;
}

function mentorProfile(exam: "yks" | "lgs", priceTry: number, subjects: string[]) {
  return {
    headline: "Sınav odaklı birebir çalışma ve soru çözümü",
    university: exam === "yks" ? "Boğaziçi Üniversitesi" : "Ankara Fen Lisesi",
    department: exam === "yks" ? "Bilgisayar Mühendisliği" : "11. sınıf",
    exam,
    score: exam === "yks" ? "YKS 2025 ilk 500" : "LGS 2023 Türkiye 1. yüzlük",
    subjects,
    priceTry,
    bio: "Eksik konuları birlikte belirleyip haftalık bir çalışma planı çıkarıyoruz.",
  };
}

async function main(): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), "rehber-smoke-"));
  let ctx: AppContext | undefined;
  let server: Server | undefined;

  try {
    ctx = createContext({
      dbPath: join(tempDir, "rehber.db"),
      allowedOrigins: [TEST_ORIGIN],
      isProduction: false,
      cookieSecure: false,
    });

    const app = createApp(ctx);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    async function api(path: string, options: ApiOptions = {}): Promise<ApiResult> {
      const method = options.method ?? "GET";
      const headers: Record<string, string> = { ...options.headers };

      if (method !== "GET" && method !== "HEAD") {
        headers["x-rehber-client"] = "web";
        headers.origin = TEST_ORIGIN;
        headers["content-type"] = "application/json";
      }

      if (options.cookie) headers.cookie = options.cookie;
      if (options.omitClient) delete headers["x-rehber-client"];
      if (options.contentType) headers["content-type"] = options.contentType;

      if (options.origin !== undefined) {
        if (options.origin === null) delete headers.origin;
        else headers.origin = options.origin;
      }

      const body =
        options.rawBody ??
        (options.body !== undefined ? JSON.stringify(options.body) : undefined);

      const response = await fetch(`${baseUrl}${path}`, { method, headers, body });
      const setCookie = response.headers.get("set-cookie");
      const text = await response.text();

      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      return {
        status: response.status,
        data,
        setCookie,
        cookie: setCookie ? (setCookie.split(";")[0] ?? null) : null,
        headers: response.headers,
      };
    }

    console.log("Rehber API smoke testi\n");

    // Database foundation and health
    ensure(ctx.db.pragma("user_version", { simple: true }) === 1, "user_version 1");
    ensure(
      String(ctx.db.pragma("journal_mode", { simple: true })).toLowerCase() === "wal",
      "journal_mode WAL",
    );
    ensure(ctx.db.pragma("foreign_keys", { simple: true }) === 1, "foreign_keys açık");
    ensure(ctx.db.pragma("busy_timeout", { simple: true }) === 5000, "busy_timeout 5000");

    const health = await api("/api/health");
    ensure(health.status === 200, "GET /api/health 200");
    ensure(
      (health.data as { ok?: boolean } | null)?.ok === true,
      "health gövdesi {ok:true}",
    );

    // CSRF and content type
    const noClient = await api("/api/auth/register", {
      method: "POST",
      omitClient: true,
      body: { username: "csrf_test", password: "demo1234", role: "student" },
    });
    ensure(noClient.status === 403, "X-Rehber-Client yoksa 403");
    ensure(errorCode(noClient.data) === "CSRF_REJECTED", "eksik başlık CSRF_REJECTED");

    const badOrigin = await api("/api/auth/register", {
      method: "POST",
      origin: "http://evil.example",
      body: { username: "origin_test", password: "demo1234", role: "student" },
    });
    ensure(badOrigin.status === 403, "izin verilmeyen Origin 403");

    const wrongContentType = await api("/api/auth/register", {
      method: "POST",
      contentType: "text/plain",
      body: { username: "type_test", password: "demo1234", role: "student" },
    });
    ensure(wrongContentType.status === 415, "text/plain gövde 415");
    ensure(
      errorCode(wrongContentType.data) === "UNSUPPORTED_MEDIA_TYPE",
      "415 kodu UNSUPPORTED_MEDIA_TYPE",
    );

    // Registration, session cookie and duplicate username
    const studentOneRegister = await api("/api/auth/register", {
      method: "POST",
      body: {
        username: "deniz",
        password: "demo1234",
        email: "deniz@example.com",
        role: "student",
      },
    });
    ensure(studentOneRegister.status === 201, "öğrenci kaydı 201");
    const studentOne = (studentOneRegister.data as AuthResponse).user;
    ensure(studentOne.role === "student", "kayıt role=student");
    ensure(
      typeof studentOneRegister.cookie === "string" &&
        studentOneRegister.cookie.startsWith(`${SESSION_COOKIE_NAME}=`),
      "rehber_session çerezi verildi",
    );
    ensure(
      /HttpOnly/i.test(studentOneRegister.setCookie ?? "") &&
        /SameSite=Lax/i.test(studentOneRegister.setCookie ?? "") &&
        /Path=\//.test(studentOneRegister.setCookie ?? ""),
      "çerez HttpOnly, SameSite=Lax, Path=/",
    );
    ensure(
      cookieMaxAge(studentOneRegister.setCookie) > 29 * 24 * 60 * 60,
      "oturum 30 gün (Max-Age)",
    );
    ensure(
      !("password_hash" in (studentOne as unknown as Record<string, unknown>)),
      "kullanıcı yanıtı password_hash içermiyor",
    );

    const storedUser = ctx.db
      .prepare("SELECT password_hash, role FROM users WHERE id = ?")
      .get(studentOne.id) as { password_hash: string; role: string } | undefined;
    ensure(
      /^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(
        storedUser?.password_hash ?? "",
      ),
      "şifre scrypt$N$r$p$salt$hash biçiminde",
    );

    let studentOneCookie = studentOneRegister.cookie ?? "";
    const me = await api("/api/auth/me", { cookie: studentOneCookie });
    ensure(me.status === 200, "GET /api/auth/me 200");
    ensure((me.data as AuthResponse).user.id === studentOne.id, "me aynı kullanıcıyı döndü");

    const anonymousMe = await api("/api/auth/me");
    ensure(anonymousMe.status === 401, "oturumsuz /me 401");

    const duplicate = await api("/api/auth/register", {
      method: "POST",
      body: { username: "DENİZ", password: "baska-parola", role: "student" },
    });
    ensure(duplicate.status === 409, "Türkçe küçük harf anahtarıyla yinelenen ad 409");
    ensure(errorCode(duplicate.data) === "USERNAME_TAKEN", "409 kodu USERNAME_TAKEN");

    const invalidRole = await api("/api/auth/register", {
      method: "POST",
      body: { username: "rolsuz", password: "demo1234" },
    });
    ensure(invalidRole.status === 400, "role olmadan kayıt 400");

    const coachMissingProfile = await api("/api/auth/register", {
      method: "POST",
      body: { username: "profilsiz", password: "demo1234", role: "mentor" },
    });
    ensure(coachMissingProfile.status === 400, "mentor kaydı profilsiz 400");

    const studentTwoRegister = await api("/api/auth/register", {
      method: "POST",
      body: { username: "ege", password: "demo1234", role: "student" },
    });
    ensure(studentTwoRegister.status === 201, "ikinci öğrenci kaydı 201");
    const studentTwo = (studentTwoRegister.data as AuthResponse).user;
    const studentTwoCookie = studentTwoRegister.cookie ?? "";

    const mentorOneRegister = await api("/api/auth/register", {
      method: "POST",
      body: {
        username: "elif",
        password: "demo1234",
        role: "mentor",
        mentorProfile: mentorProfile("yks", 500, ["Matematik", "Geometri"]),
      },
    });
    ensure(mentorOneRegister.status === 201, "mentor kaydı profille 201");
    const mentorOne = (mentorOneRegister.data as AuthResponse).user;
    const mentorOneCookie = mentorOneRegister.cookie ?? "";
    ensure(mentorOne.role === "mentor", "kayıt role=mentor");

    const mentorOneProfile = ctx.db
      .prepare("SELECT exam, price_try FROM mentor_profiles WHERE user_id = ?")
      .get(mentorOne.id) as { exam: string; price_try: number } | undefined;
    ensure(
      mentorOneProfile?.exam === "yks" && mentorOneProfile.price_try === 500,
      "mentor profili kayıtla birlikte oluştu",
    );

    const mentorTwoRegister = await api("/api/auth/register", {
      method: "POST",
      body: {
        username: "emre",
        password: "demo1234",
        role: "mentor",
        mentorProfile: mentorProfile("lgs", 400, ["Fizik"]),
      },
    });
    ensure(mentorTwoRegister.status === 201, "ikinci mentor kaydı 201");
    const mentorTwo = (mentorTwoRegister.data as AuthResponse).user;
    const mentorTwoCookie = mentorTwoRegister.cookie ?? "";

    // Public mentor list and filters
    const mentorList = await api("/api/mentors");
    ensure(mentorList.status === 200, "GET /api/mentors 200 (public)");
    const mentors = (mentorList.data as MentorListResponse).mentors;
    ensure(mentors.length === 2, "mentor listesi 2 mentor döndü");
    ensure(mentors[0]?.subjects.length === 2, "mentor dersleri dizi olarak döndü");
    ensure(!("email" in (mentors[0] ?? {})), "public mentor yanıtı e-posta içermiyor");
    ensure(mentors.every((mentor) => mentor.nextSlot === null), "slot yokken nextSlot null");

    const examFilter = await api("/api/mentors?exam=lgs");
    ensure(
      (examFilter.data as MentorListResponse).mentors.length === 1 &&
        (examFilter.data as MentorListResponse).mentors[0]?.username === "emre",
      "exam=lgs filtresi 1 mentor",
    );

    const subjectFilter = await api("/api/mentors?subject=fiz");
    ensure(
      (subjectFilter.data as MentorListResponse).mentors.length === 1 &&
        (subjectFilter.data as MentorListResponse).mentors[0]?.username === "emre",
      "subject=fiz Türkçe büyük/küçük harften bağımsız eşleşti",
    );

    const priceFilter = await api("/api/mentors?maxPrice=450");
    ensure(
      (priceFilter.data as MentorListResponse).mentors.length === 1 &&
        (priceFilter.data as MentorListResponse).mentors[0]?.username === "emre",
      "maxPrice=450 yalnızca uygun mentoru döndürdü",
    );

    const combinedFilter = await api("/api/mentors?exam=lgs&subject=fiz&maxPrice=450");
    ensure(
      (combinedFilter.data as MentorListResponse).mentors.length === 1,
      "exam + subject + maxPrice birlikte çalıştı",
    );

    const badExamFilter = await api("/api/mentors?exam=tyt");
    ensure(badExamFilter.status === 400, "geçersiz exam filtresi 400");
    ensure(errorCode(badExamFilter.data) === "VALIDATION_ERROR", "filtre hatası VALIDATION_ERROR");

    const unknownMentor = await api("/api/mentors/does-not-exist");
    ensure(unknownMentor.status === 404, "bilinmeyen mentor 404");

    // Role guards
    const studentCreatesSlot = await api("/api/mentor/slots", {
      method: "POST",
      cookie: studentOneCookie,
      body: { slots: [{ startsAt: futureSlot(2, 0), durationMin: 60 }] },
    });
    ensure(studentCreatesSlot.status === 403, "öğrenci saat ekleyemez (403)");
    ensure(errorCode(studentCreatesSlot.data) === "FORBIDDEN", "403 kodu FORBIDDEN");

    const studentSeesSlots = await api("/api/mentor/slots", { cookie: studentOneCookie });
    ensure(studentSeesSlots.status === 403, "öğrenci mentor saat listesini göremez (403)");

    const mentorBooks = await api("/api/bookings", {
      method: "POST",
      cookie: mentorOneCookie,
      body: { slotId: "not-a-real-slot", message: "Mentor olarak talep gönderiyorum." },
    });
    ensure(mentorBooks.status === 403, "mentor ders talebi gönderemez (403)");

    const anonymousBooking = await api("/api/bookings", {
      method: "POST",
      body: { slotId: "not-a-real-slot", message: "Oturumsuz talep denemesi." },
    });
    ensure(anonymousBooking.status === 401, "oturumsuz booking 401");

    // Slot management
    const startOne = futureSlot(2, 0);
    const startTwo = futureSlot(3, 0);
    const tooMany = await api("/api/mentor/slots", {
      method: "POST",
      cookie: mentorOneCookie,
      body: {
        slots: Array.from({ length: 11 }, (_, index) => ({
          startsAt: futureSlot(4, index),
          durationMin: 60,
        })),
      },
    });
    ensure(tooMany.status === 400, "11 slot tek istekte 400");
    ensure(errorCode(tooMany.data) === "VALIDATION_ERROR", "slot batch hatası VALIDATION_ERROR");

    const pastSlot = await api("/api/mentor/slots", {
      method: "POST",
      cookie: mentorOneCookie,
      body: { slots: [{ startsAt: Date.now() - HOUR, durationMin: 60 }] },
    });
    ensure(pastSlot.status === 400, "geçmiş saate slot eklenemez (400)");

    const createSlots = await api("/api/mentor/slots", {
      method: "POST",
      cookie: mentorOneCookie,
      body: {
        slots: [
          { startsAt: startOne, durationMin: 60 },
          { startsAt: startTwo, durationMin: 45 },
        ],
      },
    });
    ensure(createSlots.status === 201, "mentor 2 slot oluşturdu (201)");
    const createdSlots = (createSlots.data as MentorSlotListResponse).slots;
    ensure(createdSlots.length === 2, "slot yanıtı 2 kayıt içeriyor");
    ensure(
      createdSlots.every((slot) => slot.status === "open" && slot.pendingCount === 0),
      "yeni slotlar açık ve bekleyen talebi yok",
    );
    const slotOne = createdSlots.find((slot) => slot.startsAt === startOne);
    const slotTwo = createdSlots.find((slot) => slot.startsAt === startTwo);
    ensure(slotOne !== undefined && slotTwo !== undefined, "slot kimlikleri döndü");

    const duplicateSlot = await api("/api/mentor/slots", {
      method: "POST",
      cookie: mentorOneCookie,
      body: { slots: [{ startsAt: startOne, durationMin: 60 }] },
    });
    ensure(duplicateSlot.status === 409, "aynı başlangıç saati 409");
    ensure(errorCode(duplicateSlot.data) === "SLOT_EXISTS", "409 kodu SLOT_EXISTS");

    const mentorOneDetail = await api(`/api/mentors/${mentorOne.id}`);
    ensure(mentorOneDetail.status === 200, "mentor detayı 200");
    const detail = (mentorOneDetail.data as MentorDetailResponse).mentor;
    ensure(detail.openSlots.length === 2, "mentor detayında 2 açık slot");
    ensure(detail.nextSlot?.startsAt === startOne, "nextSlot en yakın açık saat");
    ensure(
      detail.openSlots.every((slot) => slot.startsAt > Date.now()),
      "yalnızca gelecekteki açık slotlar döndü",
    );

    const listAfterSlots = await api("/api/mentors");
    ensure(
      (listAfterSlots.data as MentorListResponse).mentors[0]?.nextSlot?.startsAt === startOne,
      "public listede nextSlot dolu",
    );

    // Booking request; the slot stays open until acceptance.
    const bookingOneResponse = await api("/api/bookings", {
      method: "POST",
      cookie: studentOneCookie,
      body: {
        slotId: slotOne!.id,
        message: "Merhaba, türev konusunda eksiklerim var. Birlikte plan çıkarabilir miyiz?",
      },
    });
    ensure(bookingOneResponse.status === 201, "öğrenci booking talebi 201");
    const bookingOne = (bookingOneResponse.data as { booking: BookingDto }).booking;
    ensure(bookingOne.status === "pending", "yeni talep pending");
    ensure(bookingOne.slot.status === "open", "talep sonrası slot hâlâ açık");

    const slotStillOpen = await api(`/api/mentors/${mentorOne.id}`);
    ensure(
      (slotStillOpen.data as MentorDetailResponse).mentor.openSlots.some(
        (slot) => slot.id === slotOne!.id,
      ),
      "talep sonrası slot public listede açık",
    );

    const duplicateBooking = await api("/api/bookings", {
      method: "POST",
      cookie: studentOneCookie,
      body: { slotId: slotOne!.id, message: "Aynı saat için ikinci talebim." },
    });
    ensure(duplicateBooking.status === 409, "aynı öğrencinin yinelenen talebi 409");
    ensure(errorCode(duplicateBooking.data) === "BOOKING_EXISTS", "409 kodu BOOKING_EXISTS");

    const bookingTwoResponse = await api("/api/bookings", {
      method: "POST",
      cookie: studentTwoCookie,
      body: {
        slotId: slotOne!.id,
        message: "Aynı saat için ben de talep göndermek istiyorum, uygun mu?",
      },
    });
    ensure(bookingTwoResponse.status === 201, "ikinci öğrenci aynı açık slota talep gönderdi");
    const bookingTwo = (bookingTwoResponse.data as { booking: BookingDto }).booking;

    const studentAccept = await api(`/api/bookings/${bookingOne.id}/accept`, {
      method: "POST",
      cookie: studentOneCookie,
    });
    ensure(studentAccept.status === 403, "öğrenci talebi kabul edemez (403)");

    const wrongMentorAccept = await api(`/api/bookings/${bookingOne.id}/accept`, {
      method: "POST",
      cookie: mentorTwoCookie,
    });
    ensure(wrongMentorAccept.status === 403, "başka mentor talebi kabul edemez (403)");

    const accept = await api(`/api/bookings/${bookingOne.id}/accept`, {
      method: "POST",
      cookie: mentorOneCookie,
    });
    ensure(accept.status === 200, "mentor talebi kabul etti (200)");
    const accepted = (accept.data as { booking: BookingDto }).booking;
    ensure(accepted.status === "accepted", "talep accepted");
    ensure(accepted.slot.status === "booked", "kabul sonrası slot booked");

    const detailAfterAccept = await api(`/api/mentors/${mentorOne.id}`);
    ensure(
      !(detailAfterAccept.data as MentorDetailResponse).mentor.openSlots.some(
        (slot) => slot.id === slotOne!.id,
      ),
      "dolu slot public açık listesinden düştü",
    );

    const studentTwoBookings = await api("/api/bookings", { cookie: studentTwoCookie });
    const secondStudentRows = (studentTwoBookings.data as BookingListResponse).bookings;
    ensure(
      secondStudentRows.find((booking) => booking.id === bookingTwo.id)?.status === "declined",
      "rakip bekleyen talep kabul sırasında otomatik reddedildi",
    );

    const studentThreeRegister = await api("/api/auth/register", {
      method: "POST",
      body: { username: "ada", password: "demo1234", role: "student" },
    });
    const studentThreeCookie = studentThreeRegister.cookie ?? "";

    const bookedSlotAttempt = await api("/api/bookings", {
      method: "POST",
      cookie: studentThreeCookie,
      body: { slotId: slotOne!.id, message: "Dolu slota talep göndermeyi deniyorum." },
    });
    ensure(bookedSlotAttempt.status === 409, "dolu slota talep 409");
    ensure(errorCode(bookedSlotAttempt.data) === "SLOT_UNAVAILABLE", "409 kodu SLOT_UNAVAILABLE");

    const deleteBooked = await api(`/api/mentor/slots/${slotOne!.id}`, {
      method: "DELETE",
      cookie: mentorOneCookie,
    });
    ensure(deleteBooked.status === 409, "dolu slot silinemez (409)");
    ensure(errorCode(deleteBooked.data) === "SLOT_BOOKED", "409 kodu SLOT_BOOKED");

    const wrongStudentCancel = await api(`/api/bookings/${bookingOne.id}/cancel`, {
      method: "POST",
      cookie: studentTwoCookie,
    });
    ensure(wrongStudentCancel.status === 403, "başka öğrenci talebi iptal edemez (403)");

    const cancelAccepted = await api(`/api/bookings/${bookingOne.id}/cancel`, {
      method: "POST",
      cookie: studentOneCookie,
    });
    ensure(cancelAccepted.status === 200, "öğrenci kabul edilmiş talebi iptal etti");
    const cancelled = (cancelAccepted.data as { booking: BookingDto }).booking;
    ensure(cancelled.status === "cancelled", "talep cancelled");

    const detailAfterCancel = await api(`/api/mentors/${mentorOne.id}`);
    ensure(
      (detailAfterCancel.data as MentorDetailResponse).mentor.openSlots.some(
        (slot) => slot.id === slotOne!.id,
      ),
      "kabul sonrası iptal slotu yeniden açtı",
    );

    // Decline frees the slot and allows another request.
    const bookingThreeResponse = await api("/api/bookings", {
      method: "POST",
      cookie: studentThreeCookie,
      body: {
        slotId: slotOne!.id,
        message: "Merhaba, boşalan saat için tekrar talep göndermek istiyorum.",
      },
    });
    ensure(bookingThreeResponse.status === 201, "boşalan slota yeniden talep 201");
    const bookingThree = (bookingThreeResponse.data as { booking: BookingDto }).booking;

    const decline = await api(`/api/bookings/${bookingThree.id}/decline`, {
      method: "POST",
      cookie: mentorOneCookie,
    });
    ensure(decline.status === 200, "mentor talebi reddetti (200)");
    const declined = (decline.data as { booking: BookingDto }).booking;
    ensure(declined.status === "declined", "talep declined");

    const slotRow = ctx.db
      .prepare("SELECT status FROM availability_slots WHERE id = ?")
      .get(slotOne!.id) as { status: string } | undefined;
    ensure(slotRow?.status === "open", "reddetme slotu açık bıraktı (DB)");

    const detailAfterDecline = await api(`/api/mentors/${mentorOne.id}`);
    ensure(
      (detailAfterDecline.data as MentorDetailResponse).mentor.openSlots.some(
        (slot) => slot.id === slotOne!.id,
      ),
      "reddetme sonrası slot public açık listede",
    );

    // Role-scoped booking lists
    const studentOneBookings = await api("/api/bookings", { cookie: studentOneCookie });
    ensure(
      (studentOneBookings.data as BookingListResponse).bookings.every(
        (booking) => booking.student.id === studentOne.id,
      ),
      "öğrenci yalnızca kendi taleplerini görüyor",
    );
    const mentorOneBookings = await api("/api/bookings", { cookie: mentorOneCookie });
    const mentorRows = (mentorOneBookings.data as BookingListResponse).bookings;
    ensure(
      mentorRows.length === 3 && mentorRows.every((booking) => booking.mentor.id === mentorOne.id),
      "mentor yalnızca kendi slotlarına gelen talepleri görüyor",
    );
    ensure(
      mentorRows[0]?.status === "declined" || mentorRows[0]?.status === "cancelled",
      "mentor geçmişi durum sırasıyla döndü",
    );
    const mentorTwoBookings = await api("/api/bookings", { cookie: mentorTwoCookie });
    ensure(
      (mentorTwoBookings.data as BookingListResponse).bookings.length === 0,
      "diğer mentorun talepleri boş",
    );

    const studentDeleteSlot = await api(`/api/mentor/slots/${slotTwo!.id}`, {
      method: "DELETE",
      cookie: studentOneCookie,
    });
    ensure(studentDeleteSlot.status === 403, "öğrenci slot silemez (403)");

    const deleteOpen = await api(`/api/mentor/slots/${slotTwo!.id}`, {
      method: "DELETE",
      cookie: mentorOneCookie,
    });
    ensure(deleteOpen.status === 204, "açık slot silindi (204)");

    const detailAfterDelete = await api(`/api/mentors/${mentorOne.id}`);
    ensure(
      !(detailAfterDelete.data as MentorDetailResponse).mentor.openSlots.some(
        (slot) => slot.id === slotTwo!.id,
      ),
      "silinen slot detaydan düştü",
    );

    // Logout and login
    const logout = await api("/api/auth/logout", {
      method: "POST",
      cookie: studentOneCookie,
    });
    ensure(logout.status === 204, "logout 204");
    ensure(
      (logout.setCookie ?? "").includes(SESSION_COOKIE_NAME),
      "logout çerezi temizliyor",
    );

    const meAfterLogout = await api("/api/auth/me", { cookie: studentOneCookie });
    ensure(meAfterLogout.status === 401, "logout sonrası eski oturum 401");

    const login = await api("/api/auth/login", {
      method: "POST",
      body: { username: "DENİZ", password: "demo1234" },
    });
    ensure(login.status === 200, "Türkçe büyük harfli kullanıcı adıyla login 200");
    ensure((login.data as AuthResponse).user.id === studentOne.id, "login doğru kullanıcı");
    studentOneCookie = login.cookie ?? "";

    const badLogin = await api("/api/auth/login", {
      method: "POST",
      body: { username: "deniz", password: "yanlis-parola" },
    });
    ensure(badLogin.status === 401, "yanlış şifre 401");
    ensure(errorCode(badLogin.data) === "INVALID_CREDENTIALS", "401 kodu INVALID_CREDENTIALS");

    ensure(studentTwo.id !== studentOne.id, "öğrenciler ayrı kimlik taşıyor");
    ensure(studentThreeCookie.length > 0, "üçüncü öğrenci oturumu açıldı");

    console.log("\nSmoke test başarılı.");
  } finally {
    if (server) {
      await new Promise<void>((resolveClose) => {
        server?.close(() => resolveClose());
        server?.closeAllConnections();
      });
    }

    ctx?.close();
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error("\nSmoke test başarısız:");
  console.error(error);
  process.exitCode = 1;
});
