import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@shared/constants";
import type {
  AuthResponse,
  BookingListResponse,
  BookingDto,
  Exam,
  MentorDetail,
  MentorDetailResponse,
  MentorListResponse,
  MentorSlotDto,
  MentorSlotListResponse,
  MentorSummary,
  UserDto,
} from "@shared/types";
import { ApiError, apiErrorFromBody } from "./api";
import { safeNextPath } from "./auth";

const API_BASE = (
  process.env.API_URL?.trim() || "http://127.0.0.1:4500"
).replace(/\/+$/u, "");

const REQUEST_TIMEOUT_MS = 5_000;

/** Reads the opaque session cookie and returns a ready `Cookie` header value. */
async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return token ? `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` : null;
}

async function serverFetch<T>(path: string, cookie: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, "INTERNAL_ERROR", "API sunucusuna ulaşılamadı.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw apiErrorFromBody(response.status, body);
  }

  return body as T;
}

/**
 * Server-side session lookup. Failures degrade to a logged-out view so public
 * pages still render when the API is unavailable.
 */
export async function getSessionUser(): Promise<UserDto | null> {
  const cookie = await readSessionCookie();
  if (!cookie) return null;

  try {
    const body = await serverFetch<AuthResponse>("/api/auth/me", cookie);
    return body.user;
  } catch {
    return null;
  }
}

/** UX guard only; Express remains the authorization boundary. */
export async function requireUser(next?: string | null): Promise<UserDto> {
  const user = await getSessionUser();
  if (!user) {
    const target = next ? safeNextPath(next, "") : "";
    redirect(target ? `/giris?next=${encodeURIComponent(target)}` : "/giris");
  }
  return user;
}

export interface MentorSearch {
  exam?: string;
  subject?: string;
  maxPrice?: string;
}

export async function getMentors(search: MentorSearch = {}): Promise<MentorSummary[]> {
  const params = new URLSearchParams();
  if (search.exam) params.set("exam", search.exam);
  if (search.subject) params.set("subject", search.subject);
  if (search.maxPrice) params.set("maxPrice", search.maxPrice);

  const query = params.toString();
  const body = await serverFetch<MentorListResponse>(
    `/api/mentors${query ? `?${query}` : ""}`,
    null,
  );
  return body.mentors;
}

export async function getMentor(id: string): Promise<MentorDetail | null> {
  try {
    const body = await serverFetch<MentorDetailResponse>(
      `/api/mentors/${encodeURIComponent(id)}`,
      null,
    );
    return body.mentor;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getMyBookings(): Promise<BookingDto[]> {
  const cookie = await readSessionCookie();
  if (!cookie) return [];

  try {
    const body = await serverFetch<BookingListResponse>("/api/bookings", cookie);
    return body.bookings;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return [];
    throw error;
  }
}

export async function getMySlots(): Promise<MentorSlotDto[]> {
  const cookie = await readSessionCookie();
  if (!cookie) return [];

  try {
    const body = await serverFetch<MentorSlotListResponse>("/api/mentor/slots", cookie);
    return body.slots;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return [];
    throw error;
  }
}

export type { Exam, MentorDetail, MentorSlotDto, MentorSummary };
