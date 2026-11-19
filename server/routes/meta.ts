import { Router, type Request, type Response } from "express";
import type { AppContext } from "../context.js";

export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({ ok: true });
}

export function createMetaRouter(ctx: AppContext): Router {
  const router = Router();

  router.get("/health", healthHandler);

  router.get("/", (_req, res) => {
    res.status(200).json({
      name: "Rehber API",
      version: 1,
      environment: ctx.config.isProduction ? "production" : "development",
    });
  });

  return router;
}
