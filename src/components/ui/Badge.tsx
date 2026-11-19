import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    "border-[color:var(--border)] bg-[color:var(--elevated)] text-[color:var(--muted)]",
  success:
    "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success)]",
  warning:
    "border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
  danger:
    "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--danger-text)]",
  accent:
    "border-[color:var(--border-strong)] bg-[color:var(--accent-soft)] text-[color:var(--text)]",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
