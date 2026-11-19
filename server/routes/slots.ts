import { Router } from "express";
import { RATE_LIMITS } from "../../shared/constants.js";
import type { AppContext } from "../context.js";
import {
  asyncHandler,
  asRecord,
  createRequireAuth,
  enforceRateLimit,
  getAuth,
  pathParam,
} from "../http.js";
import { TokenBucketRateLimiter } from "../rate-limit.js";

export function createMentorSlotsRouter(ctx: AppContext): Router {
  const router = Router();
  const requireAuth = createRequireAuth(ctx);
  const slotLimiter = new TokenBucketRateLimiter(
    RATE_LIMITS.slots.limit,
    RATE_LIMITS.slots.windowMs,
  );

  router.get("/slots", requireAuth, (req, res) => {
    res.status(200).json({
      slots: ctx.services.marketplace.listMentorSlots(getAuth(req).user),
    });
  });

  router.post(
    "/slots",
    requireAuth,
    asyncHandler((req, res) => {
      const auth = getAuth(req);
      enforceRateLimit(slotLimiter, auth.user.id, res);

      // Accept both `{ slots: [...] }` and a bare batch array.
      const rawSlots = Array.isArray(req.body) ? req.body : asRecord(req.body).slots;
      const slots = ctx.services.marketplace.createSlots(auth.user, rawSlots);
      res.status(201).json({ slots });
    }),
  );

  router.delete("/slots/:id", requireAuth, (req, res) => {
    ctx.services.marketplace.deleteMentorSlot(
      getAuth(req).user,
      pathParam(req, "id"),
    );
    res.status(204).end();
  });

  return router;
}
