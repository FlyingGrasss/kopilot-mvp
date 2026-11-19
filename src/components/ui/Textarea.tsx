import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id,
      label,
      hint,
      error,
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

        <textarea
          ref={ref}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "min-h-28 w-full resize-y rounded-lg border bg-[color:var(--surface)] px-3 py-2.5 text-sm leading-6 text-[color:var(--text)] outline-offset-2 transition-colors placeholder:text-[color:var(--muted)]",
            error
              ? "border-[color:var(--danger)]"
              : "border-[color:var(--border)] hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]",
            className,
          )}
          id={id}
          required={required}
          {...props}
        />

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
  },
);
