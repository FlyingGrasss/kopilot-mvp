"use client";

import {
  HEADLINE_MAX_LENGTH,
  HEADLINE_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PRICE_MAX_TRY,
  PRICE_MIN_TRY,
  SUBJECTS_PER_MENTOR_MAX,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@shared/constants";
import type { Exam, Role } from "@shared/types";
import { USERNAME_PATTERN } from "@shared/validation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { navigateAfterAuth, register } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { describeAuthError } from "./form-error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const FIELD_IDS: Record<string, string> = {
  username: "register-username",
  email: "register-email",
  password: "register-password",
  headline: "register-headline",
  university: "register-university",
  department: "register-department",
  exam: "register-exam",
  score: "register-score",
  subjects: "register-subjects",
  priceTry: "register-price",
  bio: "register-bio",
};

export interface RegisterFormProps {
  initialRole: Role;
  next?: string | null;
}

export function RegisterForm({ initialRole, next }: RegisterFormProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [headline, setHeadline] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [exam, setExam] = useState<Exam>("yks");
  const [score, setScore] = useState("");
  const [subjectsText, setSubjectsText] = useState("");
  const [price, setPrice] = useState("400");
  const [bio, setBio] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const roleGroupRef = useRef<HTMLDivElement>(null);

  function focusField(field: string | undefined): void {
    if (!field) return;
    if (field === "role" || field === "mentorProfile") {
      roleGroupRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
      return;
    }
    const id = FIELD_IDS[field];
    if (id) document.getElementById(id)?.focus();
  }

  function chooseRole(nextRole: Role): void {
    setRole(nextRole);
    setErrors({});
    setFormError(null);
  }

  function parseSubjects(): string[] {
    return subjectsText
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;

    setErrors({});
    setFormError(null);

    const normalizedUsername = username.normalize("NFC").trim();
    const trimmedEmail = email.trim();
    const clientErrors: Record<string, string> = {};

    if (
      normalizedUsername.length < USERNAME_MIN_LENGTH ||
      normalizedUsername.length > USERNAME_MAX_LENGTH
    ) {
      clientErrors.username = `Kullanıcı adı ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} karakter olmalı.`;
    } else if (!USERNAME_PATTERN.test(normalizedUsername)) {
      clientErrors.username =
        "Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.";
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      clientErrors.password = `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`;
    } else if (password.length > PASSWORD_MAX_LENGTH) {
      clientErrors.password = `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir.`;
    }

    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      clientErrors.email = "Geçerli bir e-posta adresi gir.";
    }

    const subjects = parseSubjects();
    const priceTry = Number(price);

    if (role === "mentor") {
      const trimmedHeadline = headline.trim();
      if (
        trimmedHeadline.length < HEADLINE_MIN_LENGTH ||
        trimmedHeadline.length > HEADLINE_MAX_LENGTH
      ) {
        clientErrors.headline = `Kısa tanıtım ${HEADLINE_MIN_LENGTH}–${HEADLINE_MAX_LENGTH} karakter olmalı.`;
      }
      if (university.trim().length < 2) {
        clientErrors.university = "Okul adı gerekli.";
      }
      if (department.trim().length < 2) {
        clientErrors.department = "Bölüm gerekli.";
      }
      if (score.trim().length < 2) {
        clientErrors.score = "Derece bilgisi gerekli.";
      }
      if (subjects.length === 0) {
        clientErrors.subjects = "En az bir ders gir.";
      } else if (subjects.length > SUBJECTS_PER_MENTOR_MAX) {
        clientErrors.subjects = `En fazla ${SUBJECTS_PER_MENTOR_MAX} ders ekleyebilirsin.`;
      }
      if (
        !Number.isInteger(priceTry) ||
        priceTry < PRICE_MIN_TRY ||
        priceTry > PRICE_MAX_TRY
      ) {
        clientErrors.priceTry = `Ders ücreti ${PRICE_MIN_TRY}–${PRICE_MAX_TRY} TL arasında olmalı.`;
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      focusField(Object.keys(clientErrors)[0]);
      return;
    }

    setPending(true);
    try {
      const user = await register({
        username: normalizedUsername,
        password,
        email: trimmedEmail || undefined,
        role,
        ...(role === "mentor"
          ? {
              mentorProfile: {
                headline: headline.trim(),
                university: university.trim(),
                department: department.trim(),
                exam,
                score: score.trim(),
                subjects,
                priceTry,
                bio: bio.trim(),
              },
            }
          : {}),
      });
      navigateAfterAuth(user, next);
    } catch (error) {
      const failure = describeAuthError(error);
      if (failure.field && FIELD_IDS[failure.field]) {
        setErrors({ [failure.field]: failure.message });
        focusField(failure.field);
      } else if (failure.field === "mentorProfile") {
        setFormError(failure.message);
        focusField("role");
      } else {
        setFormError(failure.message);
        if (failure.code === "USERNAME_TAKEN") focusField("username");
      }
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      <fieldset className="space-y-6" disabled={pending}>
        <legend className="sr-only">Hesap bilgileri</legend>

        <div>
          <p
            className="mb-2 text-sm font-medium text-[color:var(--text)]"
            id="register-role-label"
          >
            Hesap türü
          </p>
          <div
            aria-labelledby="register-role-label"
            className="grid gap-2 sm:grid-cols-2"
            ref={roleGroupRef}
            role="radiogroup"
          >
            <label
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--focus)]",
                role === "student"
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)]",
              )}
            >
              <input
                checked={role === "student"}
                className="sr-only"
                name="role"
                onChange={() => chooseRole("student")}
                type="radio"
                value="student"
              />
              <span className="text-sm font-semibold text-[color:var(--text)]">Öğrenci</span>
              <span className="text-xs leading-5 text-[color:var(--muted)]">
                Mentorları keşfet, ders talebi gönder.
              </span>
            </label>

            <label
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--focus)]",
                role === "mentor"
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)]",
              )}
            >
              <input
                checked={role === "mentor"}
                className="sr-only"
                name="role"
                onChange={() => chooseRole("mentor")}
                type="radio"
                value="mentor"
              />
              <span className="text-sm font-semibold text-[color:var(--text)]">Mentor</span>
              <span className="text-xs leading-5 text-[color:var(--muted)]">
                Profilini oluştur, saatlerini aç, talepleri yönet.
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
            Hesap türü kayıttan sonra değiştirilemez. Mentorlar ücretini kendi
            belirler; Rehber v1&apos;de ödeme almaz.
          </p>
        </div>

        <div className="space-y-4 border-t border-[color:var(--border)] pt-6">
          <Input
            autoCapitalize="none"
            autoComplete="username"
            error={errors.username}
            hint="3–20 karakter; harf, rakam ve alt çizgi."
            id="register-username"
            label="Kullanıcı adı"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            spellCheck={false}
            value={username}
          />

          <Input
            autoComplete="email"
            error={errors.email}
            hint="İsteğe bağlı. Doğrulama e-postası göndermiyoruz."
            id="register-email"
            inputMode="email"
            label="E-posta (isteğe bağlı)"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />

          <Input
            autoComplete="new-password"
            endAdornment={
              <button
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                aria-pressed={showPassword}
                className="rounded-md px-2 py-1 text-xs font-medium text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)]"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? "Gizle" : "Göster"}
              </button>
            }
            error={errors.password}
            hint="En az 8 karakter."
            id="register-password"
            label="Şifre"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
        </div>

        {role === "mentor" ? (
          <div className="space-y-4 border-t border-[color:var(--border)] pt-6">
            <div>
              <h2 className="text-sm font-semibold text-[color:var(--text)]">
                Mentor profili
              </h2>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                Bu bilgiler mentor listesinde herkese açık görünür. E-posta adresin
                gösterilmez.
              </p>
            </div>

            <Input
              error={errors.headline}
              hint="Liste kartında görünen tek cümle."
              id="register-headline"
              label="Kısa tanıtım"
              maxLength={HEADLINE_MAX_LENGTH}
              name="headline"
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Örn. Matematikte soru çözümü odaklı birebir çalışma"
              required
              value={headline}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                error={errors.university}
                id="register-university"
                label="Okul"
                name="university"
                onChange={(event) => setUniversity(event.target.value)}
                placeholder="Boğaziçi Üniversitesi"
                required
                value={university}
              />
              <Input
                error={errors.department}
                id="register-department"
                label="Bölüm / sınıf"
                name="department"
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="Bilgisayar Mühendisliği"
                required
                value={department}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                error={errors.exam}
                id="register-exam"
                label="Sınav"
                name="exam"
                onChange={(event) => setExam(event.target.value as Exam)}
                value={exam}
              >
                <option value="yks">YKS</option>
                <option value="lgs">LGS</option>
                <option value="ys">YS</option>
              </Select>
              <Input
                error={errors.score}
                id="register-score"
                label="Derece"
                name="score"
                onChange={(event) => setScore(event.target.value)}
                placeholder="YKS 2025 ilk 500"
                required
                value={score}
              />
            </div>

            <Input
              error={errors.subjects}
              hint="Virgülle ayır. Örn. Matematik, Geometri"
              id="register-subjects"
              label="Dersler"
              name="subjects"
              onChange={(event) => setSubjectsText(event.target.value)}
              placeholder="Matematik, Geometri"
              required
              value={subjectsText}
            />

            <Input
              error={errors.priceTry}
              hint={`${PRICE_MIN_TRY}–${PRICE_MAX_TRY} TL. Ödeme v1'de alınmaz; ücret bilgi amaçlıdır.`}
              id="register-price"
              inputMode="numeric"
              label="Ders ücreti (TL)"
              min={PRICE_MIN_TRY}
              name="priceTry"
              onChange={(event) => setPrice(event.target.value)}
              required
              type="number"
              value={price}
            />

            <Textarea
              error={errors.bio}
              hint="İsteğe bağlı. Nasıl çalıştığını ve kime uygun olduğunu anlat."
              id="register-bio"
              label="Uzun tanıtım (isteğe bağlı)"
              maxLength={1200}
              name="bio"
              onChange={(event) => setBio(event.target.value)}
              placeholder="Derslerde nasıl ilerlediğini, hangi konularda yardımcı olabileceğini anlat."
              value={bio}
            />
          </div>
        ) : null}

        {formError ? (
          <p
            className="rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm leading-5 text-[color:var(--danger-text)]"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <Button className="w-full" loading={pending} type="submit">
          {role === "mentor" ? "Mentor hesabı oluştur" : "Öğrenci hesabı oluştur"}
        </Button>
      </fieldset>
    </form>
  );
}
