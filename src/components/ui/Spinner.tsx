import { cn } from "@/lib/cn";

export type SpinnerSize = "sm" | "md" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent",
        sizeClasses[size],
        className,
      )}
      role={label ? "status" : undefined}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
