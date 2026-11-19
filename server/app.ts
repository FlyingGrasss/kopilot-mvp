import express, { type NextFunction, type Request, type Response } from "express";
import { MAX_BODY_BYTES } from "../shared/constants.js";
import type { AppContext } from "./context.js";
import { ApiError, sendApiError } from "./errors.js";
import { createCsrfGuard, requireJsonForMutations } from "./http.js";
import { createAuthRouter } from "./routes/auth.js";
import { createBookingsRouter } from "./routes/bookings.js";
import { createMentorsRouter } from "./routes/mentors.js";
import { createMetaRouter, healthHandler } from "./routes/meta.js";
import { createMentorSlotsRouter } from "./routes/slots.js";

export function createApp(ctx: AppContext): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("case sensitive routing", true);
  if (ctx.config.trustProxy) app.set("trust proxy", 1);

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use("/api", createCsrfGuard(ctx.config));
  app.use("/api", requireJsonForMutations);
  app.use("/api", express.json({ limit: MAX_BODY_BYTES, type: "application/json" }));

  app.use("/api/auth", createAuthRouter(ctx));
  app.use("/api/mentors", createMentorsRouter(ctx));
  app.use("/api/bookings", createBookingsRouter(ctx));
  app.use("/api/mentor", createMentorSlotsRouter(ctx));
  app.use("/api", createMetaRouter(ctx));

  app.get("/health", healthHandler);

  app.use("/api", (_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Kaynak bulunamadı." },
    });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Kaynak bulunamadı." },
    });
  });

  app.use(apiErrorHandler);

  return app;
}

function apiErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    sendApiError(res, error);
    return;
  }

  const type = readErrorType(error);

  if (type === "entity.too.large") {
    sendApiError(
      res,
      new ApiError(413, "PAYLOAD_TOO_LARGE", "İstek gövdesi çok büyük."),
    );
    return;
  }

  if (type === "entity.parse.failed") {
    sendApiError(res, new ApiError(400, "INVALID_JSON", "İstek gövdesi geçerli JSON değil."));
    return;
  }

  if (type === "charset.unsupported" || type === "encoding.unsupported") {
    sendApiError(
      res,
      new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Desteklenmeyen karakter kodlaması."),
    );
    return;
  }

  console.error(`[api] ${req.method} ${req.path} işlenemedi:`, error);
  sendApiError(
    res,
    new ApiError(500, "INTERNAL_ERROR", "Beklenmeyen bir sunucu hatası oluştu."),
  );
}

function readErrorType(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return undefined;
  }
  const type = (error as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}
