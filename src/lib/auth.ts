import type { AuthResponse, UserDto } from "@shared/types";
import type { MentorProfileInput } from "@shared/validation";
import { apiFetch } from "./api";

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  email?: string;
  role: "student" | "mentor";
  mentorProfile?: MentorProfileInput;
}

export async function login(input: LoginInput): Promise<UserDto> {
  const body = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      password: input.password,
    }),
  });
  return body.user;
}

export async function register(input: RegisterInput): Promise<UserDto> {
  const email = input.email?.trim();
  const payload: Record<string, unknown> = {
    username: input.username,
    password: input.password,
    role: input.role,
  };
  if (email) payload.email = email;
  if (input.role === "mentor" && input.mentorProfile) {
    payload.mentorProfile = input.mentorProfile;
  }

  const body = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body.user;
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" });
}

const INTERNAL_ORIGIN = "http://rehber.local";
const AUTH_PATHS = new Set(["/giris", "/kayit"]);

/**
 * Returns an origin-relative path only. Absolute URLs, protocol-relative URLs,
 * backslashes, control characters and API/auth routes fall back safely.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/panel",
): string {
  if (!value) return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return fallback;

    const normalized = `${url.pathname}${url.search}${url.hash}`;
    if (
      !normalized.startsWith("/") ||
      normalized.startsWith("//") ||
      normalized.includes("\\")
    ) {
      return fallback;
    }
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_next")) {
      return fallback;
    }
    if (AUTH_PATHS.has(url.pathname)) return fallback;
    return normalized;
  } catch {
    return fallback;
  }
}

/** Builds `/giris?next=...`-style links without ever forwarding an unsafe path. */
export function withNext(path: string, next?: string | null): string {
  const target = next ? safeNextPath(next, "") : "";
  return target ? `${path}?next=${encodeURIComponent(target)}` : path;
}

export function defaultPathForRole(role: "student" | "mentor"): string {
  return role === "mentor" ? "/panel" : "/mentorlar";
}

/** Full navigation so server components re-read the new session cookie. */
export function navigateAfterAuth(user: UserDto, next?: string | null): void {
  if (typeof window === "undefined") return;
  const target = next ? safeNextPath(next, defaultPathForRole(user.role)) : defaultPathForRole(user.role);
  window.location.assign(target);
}
