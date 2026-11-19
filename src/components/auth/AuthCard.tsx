import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface AuthCardProps {
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full max-w-md rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 sm:p-8",
        className,
      )}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{description}</p>
      </div>

      {children}

      {footer ? (
        <div className="mt-6 space-y-3 border-t border-[color:var(--border)] pt-5 text-sm text-[color:var(--muted)]">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
