import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { UserDto } from "@shared/types";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { defaultPathForRole, safeNextPath, withNext } from "@/lib/auth";
import { getSessionUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesap oluştur",
  description:
    "Rehber'de öğrenci hesabı açıp mentor bul veya mentor hesabı açıp saatlerini yönet.",
  robots: { index: false, follow: false },
};

interface RegisterPageProps {
  searchParams: Promise<{ role?: string | string[]; next?: string | string[] }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const roleParam = typeof params.role === "string" ? params.role : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const user: UserDto | null = await getSessionUser();

  if (user) redirect(safeNextPath(next, defaultPathForRole(user.role)));

  return (
    <AuthCard
      className="max-w-2xl"
      description="Öğrenci olarak mentor bul veya mentor olarak profilini ve saatlerini yönet."
      footer={
        <>
          <p>
            Zaten hesabın var mı?{" "}
            <Link
              className="font-medium text-[color:var(--accent-text)] underline-offset-4 hover:underline"
              href={withNext("/giris", next)}
            >
              Giriş yap
            </Link>
          </p>
          <p className="text-xs leading-5">
            Rehber v1&apos;de ödeme almaz. Mentor ücretleri profillerde bilgi
            amaçlı gösterilir.
          </p>
        </>
      }
      title="Hesap oluştur"
    >
      <RegisterForm initialRole={roleParam === "mentor" ? "mentor" : "student"} next={next} />
    </AuthCard>
  );
}
