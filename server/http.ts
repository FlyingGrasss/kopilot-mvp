import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  SESSION_COOKIE_NAME,
} from "../shared/constants.js";
import type { AppConfig } from "./config.js";
import type { AppContext } from "./context.js";
import { ApiError } from "./errors.js";
import type { TokenBucketRateLimiter } from "./rate-limit.js";
import type { AuthContext } from "./services/auth.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type RouteHandler = (req: Request, res: Response, next: NextFunction) => unknown;

export function asyncHandler(handler: RouteHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim();
    if (key !== name) continue;

    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return null;
}

export function getSessionToken(req: Request): string | null {
  return readCookie(req.headers.cookie, SESSION_COOKIE_NAME);
}

export function setSessionCookie(
  res: Response,
  config: AppConfig,
  token: string,
  expiresAt: number,
): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: Math.max(0, expiresAt - Date.now()),
  });
}

export function clearSessionCookie(res: Response, config: AppConfig): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
  });
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new ApiError(500, "INTERNAL_ERROR", "İstek kimliği çözülemedi.");
  }
  return req.auth;
}

export function createRequireAuth(ctx: AppContext): RequestHandler {
  return (req, _res, next) => {
    const token = getSessionToken(req);
    const auth = ctx.services.auth.resolveSession(token);

    if (!auth) {
      next(new ApiError(401, "UNAUTHORIZED", "Oturum gerekli."));
      return;
    }

    req.auth = auth;
    next();
  };
}

export function createCsrfGuard(config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    if (req.get(CSRF_HEADER_NAME) !== CSRF_HEADER_VALUE) {
      next(new ApiError(403, "CSRF_REJECTED", "İstemci doğrulanamadı."));
      return;
    }

    const origin = req.get("origin");
    if (!origin || !config.allowedOrigins.includes(origin)) {
      next(new ApiError(403, "CSRF_REJECTED", "İstek kaynağına izin verilmiyor."));
      return;
    }

    next();
  };
}

export function requireJsonForMutations(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  if (!req.is("application/json")) {
    const contentLength = req.headers["content-length"];
    const hasBody =
      (contentLength !== undefined && Number(contentLength) > 0) ||
      req.headers["transfer-encoding"] !== undefined;

    if (hasBody) {
      next(
        new ApiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "İstek gövdesi application/json olmalı.",
        ),
      );
      return;
    }
  }

  next();
}

export function enforceRateLimit(
  limiter: TokenBucketRateLimiter,
  key: string,
  res: Response,
): void {
  const decision = limiter.take(key);
  if (decision.allowed) return;

  res.setHeader(
    "Retry-After",
    String(Math.max(1, Math.ceil(decision.retryAfterMs / 1000))),
  );
  throw new ApiError(
    429,
    "RATE_LIMITED",
    "Çok fazla deneme. Lütfen biraz sonra tekrar dene.",
    { retryAfterMs: decision.retryAfterMs },
  );
}

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function firstQuery(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}
