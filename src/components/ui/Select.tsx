import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    hint,
    error,
    containerClassName,
    className,
    required,
    children,
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

      <select
        ref={ref}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border bg-[color:var(--surface)] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-9 text-sm text-[color:var(--text)] outline-offset-2 transition-colors",
          error
            ? "border-[color:var(--danger)]"
            : "border-[color:var(--border)] hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]",
          className,
        )}
        id={id}
        required={required}
        {...props}
      >
        {children}
      </select>

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
