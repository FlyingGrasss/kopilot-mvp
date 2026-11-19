import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)]",
  secondary:
    "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--elevated)]",
  ghost:
    "border-transparent bg-transparent text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)]",
  danger:
    "border-transparent bg-[color:var(--danger)] text-white hover:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

/** Shared styles so `<Link>` CTAs can look like buttons without nested controls. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? <Spinner label="İşleniyor" size="sm" /> : null}
      {children}
    </button>
  );
});
