import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  endAdornment?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    hint,
    error,
    endAdornment,
    containerClassName,
    className,
    required,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref,
) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [
    ariaDescribedBy,
    hint && !error ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <label
        className="mb-1.5 block text-sm font-medium text-[color:var(--text)]"
        htmlFor={id}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[color:var(--danger-text)]">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        <input
          ref={ref}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-[color:var(--surface)] px-3 text-sm text-[color:var(--text)] outline-offset-2 transition-colors placeholder:text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-[color:var(--danger)]"
              : "border-[color:var(--border)] hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]",
            endAdornment ? "pr-20" : null,
            className,
          )}
          id={id}
          required={required}
          {...props}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            {endAdornment}
          </div>
        ) : null}
      </div>

      {hint && !error ? (
        <p className="mt-1.5 text-xs leading-5 text-[color:var(--muted)]" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          className="mt-1.5 text-xs leading-5 text-[color:var(--danger-text)]"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});
