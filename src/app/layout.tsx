import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rehber — Derece yapmış mentorlardan birebir ders",
    template: "%s · Rehber",
  },
  description:
    "YKS ve LGS'ye hazırlanan öğrenciler, derece yapmış mentorlarla birebir ders için doğrudan iletişim kurar.",
  applicationName: "Rehber",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Rehber",
    title: "Rehber — Derece yapmış mentorlardan birebir ders",
    description:
      "Hedefine uygun mentoru seç, uygun saati ayır ve ders talebini gönder. Ödeme v1'de yok.",
  },
  twitter: {
    card: "summary",
    title: "Rehber — Derece yapmış mentorlardan birebir ders",
    description:
      "Hedefine uygun mentoru seç, uygun saati ayır ve ders talebini gönder. Ödeme v1'de yok.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
