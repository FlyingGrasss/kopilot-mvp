"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { UserDto } from "@shared/types";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/Toaster";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { displayName } from "@/lib/format";

const ITEM_COUNT = 3;

export interface AccountMenuProps {
  user: UserDto;
  className?: string;
}

export function AccountMenu({ user, className }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const openFocusRef = useRef<0 | 1>(0);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const targetIndex = openFocusRef.current;
    setActiveIndex(targetIndex);
    const frame = window.requestAnimationFrame(() => {
      itemRefs.current[targetIndex]?.focus();
    });

    function handlePointerDown(event: PointerEvent): void {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleFocusIn(event: FocusEvent): void {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [open]);

  function closeAndRestore(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function focusItem(index: number): void {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestore();
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusItem(ITEM_COUNT - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem((activeIndex + 1) % ITEM_COUNT);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem((activeIndex - 1 + ITEM_COUNT) % ITEM_COUNT);
    }
  }

  async function handleLogout(): Promise<void> {
    if (pending) return;
    setPending(true);
    setOpen(false);

    try {
      await logout();
      window.location.assign("/");
    } catch {
      setPending(false);
      triggerRef.current?.focus();
      toast("Çıkış yapılamadı. Tekrar dene.", { tone: "error" });
    }
  }

  const roleLabel = user.role === "mentor" ? "Mentor" : "Öğrenci";

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        ref={triggerRef}
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Hesap menüsü: ${displayName(user.username)}`}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-transparent px-1.5 text-[color:var(--text)] transition-colors hover:border-[color:var(--border)] hover:bg-[color:var(--surface)] disabled:pointer-events-none disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          openFocusRef.current = 0;
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openFocusRef.current = event.key === "ArrowUp" ? 1 : 0;
            setOpen(true);
          }
        }}
        type="button"
      >
        <Avatar name={displayName(user.username)} size="sm" />
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
          {displayName(user.username)}
        </span>
        <Icon className="hidden text-[color:var(--muted)] sm:block" name="chevron-down" size={14} />
      </button>

      {open ? (
        <div
          aria-label="Hesap menüsü"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 shadow-xl"
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          role="menu"
        >
          <div className="px-2.5 py-2" role="presentation">
            <p className="truncate text-sm font-semibold text-[color:var(--text)]">
              {displayName(user.username)}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">{roleLabel} hesabı</p>
          </div>

          <div className="my-1 h-px bg-[color:var(--border)]" role="separator" />

          <Link
            ref={(element) => {
              itemRefs.current[0] = element;
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[color:var(--text)] transition-colors hover:bg-[color:var(--elevated)]"
            href="/panel"
            onClick={() => setOpen(false)}
            onFocus={() => setActiveIndex(0)}
            role="menuitem"
            tabIndex={activeIndex === 0 ? 0 : -1}
          >
            <Icon name="layout-dashboard" size={16} />
            <span className="min-w-0 flex-1 truncate">Panelim</span>
          </Link>

          <Link
            ref={(element) => {
              itemRefs.current[1] = element;
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[color:var(--text)] transition-colors hover:bg-[color:var(--elevated)]"
            href="/mentorlar"
            onClick={() => setOpen(false)}
            onFocus={() => setActiveIndex(1)}
            role="menuitem"
            tabIndex={activeIndex === 1 ? 0 : -1}
          >
            <Icon name="search" size={16} />
            <span className="min-w-0 flex-1 truncate">Mentorları keşfet</span>
          </Link>

          <button
            ref={(element) => {
              itemRefs.current[2] = element;
            }}
            aria-busy={pending || undefined}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[color:var(--danger-text)] transition-colors hover:bg-[color:var(--danger-soft)] disabled:pointer-events-none disabled:opacity-60"
            disabled={pending}
            onClick={() => void handleLogout()}
            onFocus={() => setActiveIndex(2)}
            role="menuitem"
            tabIndex={activeIndex === 2 ? 0 : -1}
            type="button"
          >
            <Icon name="log-out" size={16} />
            <span className="min-w-0 flex-1 truncate">
              {pending ? "Çıkış yapılıyor…" : "Çıkış yap"}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
