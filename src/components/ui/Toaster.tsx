"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export type ToastTone = "info" | "success" | "error";

export interface ToastOptions {
  tone?: ToastTone;
  /** Pass 0 to keep the toast until it is dismissed. */
  durationMs?: number;
}

interface ToastRecord {
  id: number;
  message: string;
  tone: ToastTone;
}

let nextId = 1;
let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();
const timers = new Map<number, number>();
const EMPTY_TOASTS: ToastRecord[] = [];

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastRecord[] {
  return toasts;
}

function getServerSnapshot(): ToastRecord[] {
  return EMPTY_TOASTS;
}

export function toast(message: string, options: ToastOptions = {}): number {
  const id = nextId;
  nextId += 1;

  const record: ToastRecord = {
    id,
    message,
    tone: options.tone ?? "info",
  };
  toasts = [...toasts, record];
  emit();

  const durationMs = options.durationMs ?? (record.tone === "error" ? 6000 : 4000);
  if (durationMs > 0 && typeof window !== "undefined") {
    timers.set(
      id,
      window.setTimeout(() => dismissToast(id), durationMs),
    );
  }

  return id;
}

export function dismissToast(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }

  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

const toneClasses: Record<ToastTone, string> = {
  info: "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]",
  success:
    "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--text)]",
  error:
    "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--text)]",
};

const toneIconClasses: Record<ToastTone, string> = {
  info: "text-[color:var(--muted)]",
  success: "text-[color:var(--success)]",
  error: "text-[color:var(--danger-text)]",
};

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {items.map((item) => (
        <div
          className={cn(
            "toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-lg",
            toneClasses[item.tone],
          )}
          key={item.id}
        >
          <Icon
            className={cn("mt-0.5 shrink-0", toneIconClasses[item.tone])}
            name={item.tone === "success" ? "check" : item.tone === "error" ? "alert-triangle" : "clock"}
            size={16}
          />
          <p className="min-w-0 flex-1 leading-5">{item.message}</p>
          <button
            aria-label="Bildirimi kapat"
            className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)]"
            onClick={() => dismissToast(item.id)}
            type="button"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
