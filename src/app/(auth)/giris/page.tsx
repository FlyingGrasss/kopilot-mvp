import type { UserDto } from "@shared/types";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { defaultPathForRole, safeNextPath, withNext } from "@/lib/auth";
import { getSessionUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giriş yap",
  description: "Rehber hesabına giriş yap ve ders taleplerini yönet.",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const user: UserDto | null = await getSessionUser();

  if (user) redirect(safeNextPath(next, defaultPathForRole(user.role)));

  return (
    <AuthCard
      description="Panelindeki taleplere ve açık saatlere dön."
      footer={
        <>
          <p>
            Hesabın yok mu?{" "}
            <Link
              className="font-medium text-[color:var(--accent-text)] underline-offset-4 hover:underline"
              href={withNext("/kayit", next)}
            >
              Hesap oluştur
            </Link>
          </p>
          <p>
            <Link
              className="font-medium text-[color:var(--accent-text)] underline-offset-4 hover:underline"
              href="/mentorlar"
            >
              Mentorlara göz at
            </Link>
          </p>
          <p className="text-xs leading-5">
            Demo hesaplarının şifresi README&apos;de yazar. Ödeme v1&apos;de yok.
          </p>
        </>
      }
      title="Tekrar hoş geldin"
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
