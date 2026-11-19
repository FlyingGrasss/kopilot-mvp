import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "calendar",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--elevated)] text-[color:var(--muted)]">
        <Icon name={icon} size={18} />
      </span>
      <p className="mt-3 text-sm font-semibold text-[color:var(--text)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[color:var(--muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
