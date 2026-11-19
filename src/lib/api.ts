import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@shared/constants";
import type { ApiErrorCode } from "@shared/types";

export interface ApiErrorOptions {
  field?: string;
  retryAfterMs?: number;
}

/** Normalized error for every `/api` response in the browser. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly field?: string;
  readonly retryAfterMs?: number;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = options.field;
    this.retryAfterMs = options.retryAfterMs;
  }
}

function fallbackCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 429:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_ERROR";
  }
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 401:
      return "Oturum gerekli.";
    case 403:
      return "Bu işlem için yetkin yok.";
    case 404:
      return "Kaynak bulunamadı.";
    case 429:
      return "Çok fazla deneme. Lütfen biraz sonra tekrar dene.";
    default:
      return "Bir şeyler ters gitti. Tekrar dene.";
  }
}

/** Parses the API's `{ error: { code, message, field?, retryAfterMs? } }` envelope. */
export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const envelope =
    typeof body === "object" && body !== null && "error" in body
      ? (body as { error?: unknown }).error
      : undefined;

  if (typeof envelope === "object" && envelope !== null) {
    const record = envelope as Record<string, unknown>;
    const message =
      typeof record.message === "string" && record.message.trim()
        ? record.message
        : fallbackMessage(status);
    const code =
      typeof record.code === "string" ? (record.code as ApiErrorCode) : fallbackCode(status);

    return new ApiError(status, code, message, {
      ...(typeof record.field === "string" ? { field: record.field } : {}),
      ...(typeof record.retryAfterMs === "number" &&
      Number.isFinite(record.retryAfterMs)
        ? { retryAfterMs: record.retryAfterMs }
        : {}),
    });
  }

  return new ApiError(status, fallbackCode(status), fallbackMessage(status));
}

/**
 * Same-origin API request used by client components.
 * The web client header and JSON content type satisfy the Express guards.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new ApiError(0, "INTERNAL_ERROR", "Geçersiz istek yolu.");
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set(CSRF_HEADER_NAME, CSRF_HEADER_VALUE);
  if (init.body !== undefined && init.body !== null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: init.credentials ?? "same-origin",
    });
  } catch {
    throw new ApiError(
      0,
      "INTERNAL_ERROR",
      "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.",
    );
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
