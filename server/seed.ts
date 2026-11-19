import { DEFAULT_AVATAR_COLORS } from "../shared/constants.js";
import { usernameKey } from "../shared/validation.js";
import { resolveConfig } from "./config.js";
import { openDatabase, type AppDatabase } from "./db.js";
import { insertBooking } from "./repos/bookings.js";
import { insertMentorProfile } from "./repos/mentors.js";
import { insertSlot } from "./repos/slots.js";
import { insertUser } from "./repos/users.js";
import { hashPassword } from "./services/auth.js";

const DEMO_PASSWORD = "demo1234";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const ISTANBUL_OFFSET = 3 * HOUR;

interface MentorSeed {
  id: string;
  username: string;
  headline: string;
  university: string;
  department: string;
  exam: "ys" | "yks" | "lgs";
  score: string;
  subjects: string[];
  priceTry: number;
  bio: string;
  avatarColor: string;
}

interface StudentSeed {
  id: string;
  username: string;
}

const MENTORS: MentorSeed[] = [
  {
    id: "seed_mentor_elif",
    username: "elif_yılmaz",
    headline: "Matematikte temelden ileri seviyeye, soru çözümü odaklı",
    university: "Boğaziçi Üniversitesi",
    department: "Bilgisayar Mühendisliği",
    exam: "yks",
    score: "YKS 2025 ilk 500",
    subjects: ["Matematik", "Geometri"],
    priceTry: 600,
    bio: "Matematiği ezber değil, mantığını kurarak öğretmeyi seviyorum. TYT ve AYT soru çözümünde birlikte çalışabilir, haftalık planını birlikte kurabiliriz.",
    avatarColor: DEFAULT_AVATAR_COLORS[0],
  },
  {
    id: "seed_mentor_mert",
    username: "mert_kaya",
    headline: "Fizik ve matematikte sınav odaklı birebir çalışma",
    university: "Orta Doğu Teknik Üniversitesi",
    department: "Elektrik-Elektronik Mühendisliği",
    exam: "yks",
    score: "YKS 2024 ilk 1.000",
    subjects: ["Fizik", "Matematik"],
    priceTry: 500,
    bio: "Fizik sorularını günlük hayattan örneklerle anlatıyorum. Özellikle elektrik, hareket ve enerji konularında soru çözümü yapabiliriz.",
    avatarColor: DEFAULT_AVATAR_COLORS[1],
  },
  {
    id: "seed_mentor_zeynep",
    username: "zeynep_demir",
    headline: "Tıp hedefi için kimya ve biyoloji çalışma arkadaşı",
    university: "Hacettepe Üniversitesi",
    department: "Tıp",
    exam: "yks",
    score: "YKS 2024 ilk 300",
    subjects: ["Kimya", "Biyoloji"],
    priceTry: 700,
    bio: "Tıp kazanma sürecinde hangi konuya ne kadar zaman ayırman gerektiğini birlikte planlayabiliriz. Konu anlatımından çok, soru üzerinden eksik kapatmayı seviyorum.",
    avatarColor: DEFAULT_AVATAR_COLORS[2],
  },
  {
    id: "seed_mentor_can",
    username: "can_aydın",
    headline: "Sayısal bölümler için matematik ve fizik desteği",
    university: "İstanbul Teknik Üniversitesi",
    department: "Makine Mühendisliği",
    exam: "yks",
    score: "YKS 2023 ilk 1.500",
    subjects: ["Matematik", "Fizik"],
    priceTry: 450,
    bio: "Mühendislik hedefleyen öğrencilerle çalışmayı seviyorum. Zor soruları parçalara ayırıp çözme alışkanlığı kazandırmaya odaklanıyorum.",
    avatarColor: DEFAULT_AVATAR_COLORS[3],
  },
  {
    id: "seed_mentor_selin",
    username: "selin_arslan",
    headline: "Türkçe ve edebiyatta paragraf ve yorum teknikleri",
    university: "Koç Üniversitesi",
    department: "Hukuk",
    exam: "yks",
    score: "YKS 2025 ilk 800",
    subjects: ["Türkçe", "Edebiyat"],
    priceTry: 650,
    bio: "Paragraf sorularında süre yönetimi ve doğru okuma alışkanlığı üzerine çalışıyoruz. Edebiyat için konu özetleri ve tekrar planı çıkarabiliriz.",
    avatarColor: DEFAULT_AVATAR_COLORS[4],
  },
  {
    id: "seed_mentor_burak",
    username: "burak_şahin",
    headline: "TYT matematikte net artırmaya yönelik düzenli program",
    university: "Bilkent Üniversitesi",
    department: "Endüstri Mühendisliği",
    exam: "yks",
    score: "YKS 2023 ilk 2.000",
    subjects: ["Matematik"],
    priceTry: 400,
    bio: "Temel konularda eksiği olan öğrencilerle baştan başlayarak ilerlemeyi seviyorum. Her ders sonunda küçük bir ödev ve tekrar listesi bırakıyorum.",
    avatarColor: DEFAULT_AVATAR_COLORS[5],
  },
  {
    id: "seed_mentor_derya",
    username: "derya_koç",
    headline: "İngilizce yazma ve okuma pratiği için konuşma ağırlıklı ders",
    university: "Marmara Üniversitesi",
    department: "İngilizce Öğretmenliği",
    exam: "ys",
    score: "YS 2024 ilk 100",
    subjects: ["İngilizce"],
    priceTry: 300,
    bio: "Dil sınavlarına hazırlanan öğrencilerle okuma, kelime ve yazma pratiği yapıyorum. Dersin büyük bölümünde Türkçe açıklama yerine İngilizce konuşmaya çalışıyoruz.",
    avatarColor: DEFAULT_AVATAR_COLORS[6],
  },
  {
    id: "seed_mentor_emre",
    username: "emre_çelik",
    headline: "LGS fen bilimleri ve matematikte yeni nesil soru çözümü",
    university: "Ankara Fen Lisesi",
    department: "11. sınıf",
    exam: "lgs",
    score: "LGS 2023 Türkiye 1. yüzlük",
    subjects: ["Fen Bilimleri", "Matematik"],
    priceTry: 350,
    bio: "LGS'ye hazırlanan öğrencilerle yeni nesil soru mantığını çalışıyorum. Kısa konu tekrarından sonra bol soru ve yanlış analizi yapıyoruz.",
    avatarColor: DEFAULT_AVATAR_COLORS[7],
  },
];

const STUDENTS: StudentSeed[] = [
  { id: "seed_student_deniz", username: "deniz_ak" },
  { id: "seed_student_ege", username: "ege_yıldız" },
  { id: "seed_student_ada", username: "ada_karaca" },
  { id: "seed_student_kerem", username: "kerem_öz" },
];

interface SlotSeed {
  id: string;
  mentorId: string;
  dayOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
}

const SLOTS: SlotSeed[] = [
  { id: "seed_slot_01", mentorId: "seed_mentor_elif", dayOffset: 1, hour: 18, minute: 0, durationMin: 60 },
  { id: "seed_slot_02", mentorId: "seed_mentor_mert", dayOffset: 1, hour: 19, minute: 30, durationMin: 45 },
  { id: "seed_slot_03", mentorId: "seed_mentor_zeynep", dayOffset: 2, hour: 17, minute: 0, durationMin: 60 },
  { id: "seed_slot_04", mentorId: "seed_mentor_can", dayOffset: 2, hour: 18, minute: 30, durationMin: 60 },
  { id: "seed_slot_05", mentorId: "seed_mentor_selin", dayOffset: 3, hour: 16, minute: 0, durationMin: 45 },
  { id: "seed_slot_06", mentorId: "seed_mentor_burak", dayOffset: 3, hour: 17, minute: 30, durationMin: 60 },
  { id: "seed_slot_07", mentorId: "seed_mentor_derya", dayOffset: 4, hour: 19, minute: 0, durationMin: 45 },
  { id: "seed_slot_08", mentorId: "seed_mentor_emre", dayOffset: 4, hour: 20, minute: 0, durationMin: 60 },
  { id: "seed_slot_09", mentorId: "seed_mentor_elif", dayOffset: 5, hour: 17, minute: 0, durationMin: 60 },
  { id: "seed_slot_10", mentorId: "seed_mentor_mert", dayOffset: 5, hour: 18, minute: 30, durationMin: 45 },
  { id: "seed_slot_11", mentorId: "seed_mentor_zeynep", dayOffset: 6, hour: 16, minute: 0, durationMin: 60 },
  { id: "seed_slot_12", mentorId: "seed_mentor_selin", dayOffset: 6, hour: 17, minute: 30, durationMin: 45 },
];

interface SeedCounts {
  users: number;
  mentors: number;
  slots: number;
  openSlots: number;
  bookings: number;
}

function countRows(db: AppDatabase, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
    count: number;
  };
  return row.count;
}

function resetTables(db: AppDatabase): void {
  db.exec(`
    DELETE FROM bookings;
    DELETE FROM availability_slots;
    DELETE FROM mentor_profiles;
    DELETE FROM sessions;
    DELETE FROM users;
  `);
}

/**
 * Builds an epoch for a wall-clock time in Türkiye (UTC+3, no DST).
 * Day offsets always point at tomorrow or later, so seeded slots are future-safe.
 */
function istanbulSlot(now: number, dayOffset: number, hour: number, minute: number): number {
  const istNow = new Date(now + ISTANBUL_OFFSET);
  const utc = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + dayOffset,
    hour,
    minute,
    0,
    0,
  );
  return utc - ISTANBUL_OFFSET;
}

function insertSeedData(db: AppDatabase, passwordHash: string, now: number): void {
  const usersCreatedAt = now - 45 * DAY;

  MENTORS.forEach((mentor, index) => {
    insertUser(db, {
      id: mentor.id,
      username: mentor.username,
      usernameKey: usernameKey(mentor.username),
      email: null,
      passwordHash,
      role: "mentor",
      createdAt: usersCreatedAt + index * MINUTE,
    });
    insertMentorProfile(db, {
      userId: mentor.id,
      headline: mentor.headline,
      university: mentor.university,
      department: mentor.department,
      exam: mentor.exam,
      score: mentor.score,
      subjects: mentor.subjects,
      priceTry: mentor.priceTry,
      bio: mentor.bio,
      avatarColor: mentor.avatarColor,
    });
  });

  STUDENTS.forEach((student, index) => {
    insertUser(db, {
      id: student.id,
      username: student.username,
      usernameKey: usernameKey(student.username),
      email: null,
      passwordHash,
      role: "student",
      createdAt: usersCreatedAt + (MENTORS.length + index) * MINUTE,
    });
  });

  for (const slot of SLOTS) {
    insertSlot(db, {
      id: slot.id,
      mentorId: slot.mentorId,
      startsAt: istanbulSlot(now, slot.dayOffset, slot.hour, slot.minute),
      durationMin: slot.durationMin,
    });
  }

  insertBooking(db, {
    id: "seed_booking_01",
    slotId: "seed_slot_01",
    studentId: "seed_student_deniz",
    mentorId: "seed_mentor_elif",
    message:
      "Merhaba, türev ve integral konularında eksiklerim var. İlk derste seviyemi ölçüp bir çalışma planı çıkarabilir miyiz?",
    createdAt: now - 2 * HOUR,
  });

  insertBooking(db, {
    id: "seed_booking_02",
    slotId: "seed_slot_03",
    studentId: "seed_student_ege",
    mentorId: "seed_mentor_zeynep",
    message:
      "Tıp hedefim için kimya netlerimi artırmak istiyorum. Organik kimya için ayrı bir plan yapabilir miyiz?",
    createdAt: now - 5 * HOUR,
  });
}

function verifySeedCounts(db: AppDatabase): SeedCounts {
  const counts: SeedCounts = {
    users: countRows(db, "users"),
    mentors: countRows(db, "mentor_profiles"),
    slots: countRows(db, "availability_slots"),
    openSlots: (
      db.prepare("SELECT COUNT(*) AS count FROM availability_slots WHERE status = 'open'").get() as {
        count: number;
      }
    ).count,
    bookings: countRows(db, "bookings"),
  };

  if (
    counts.users !== 12 ||
    counts.mentors !== 8 ||
    counts.slots !== 12 ||
    counts.openSlots !== 12 ||
    counts.bookings !== 2
  ) {
    throw new Error(`[seed] Beklenen demo sayıları tutmadı: ${JSON.stringify(counts)}`);
  }

  return counts;
}

function printSummary(counts: SeedCounts): void {
  console.log("[seed] Demo verisi hazır.");
  console.log(`[seed] Tüm demo hesapların şifresi: ${DEMO_PASSWORD}`);
  console.log(
    `[seed] Mentorlar: ${MENTORS.map((mentor) => mentor.username).join(", ")}`,
  );
  console.log(
    `[seed] Öğrenciler: ${STUDENTS.map((student) => student.username).join(", ")}`,
  );
  console.log(
    `[seed] Sayılar: ${counts.users} kullanıcı, ${counts.mentors} mentor profili, ` +
      `${counts.openSlots} açık saat, ${counts.bookings} örnek talep`,
  );
  console.log("[seed] Giriş sayfası: http://localhost:3000/giris");
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const reset = args.has("--reset");
  const ifEmpty = args.has("--if-empty");
  const config = resolveConfig();

  if (reset && config.isProduction) {
    console.error("[seed] --reset üretim ortamında reddedildi.");
    process.exitCode = 1;
    return;
  }

  const db = openDatabase(config.dbPath);
  try {
    if (!reset && countRows(db, "users") > 0) {
      if (ifEmpty) {
        console.log("[seed] Kullanıcılar mevcut; --if-empty nedeniyle atlandı.");
        return;
      }
      throw new Error(
        "Veritabanında kullanıcı var. Temiz demo verisi için `pnpm seed:reset` çalıştır.",
      );
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const now = Date.now();
    const counts = db.transaction(() => {
      if (reset) resetTables(db);
      insertSeedData(db, passwordHash, now);
      return verifySeedCounts(db);
    })();

    printSummary(counts);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed] Hata: ${message}`);
  process.exitCode = 1;
});
