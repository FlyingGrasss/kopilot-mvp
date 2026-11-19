import { Router } from "express";
import { RATE_LIMITS } from "../../shared/constants.js";
import type { AppContext } from "../context.js";
import { getAuth, asyncHandler, asRecord, createRequireAuth, enforceRateLimit, pathParam } from "../http.js";
import { TokenBucketRateLimiter } from "../rate-limit.js";

export function createBookingsRouter(ctx: AppContext): Router {
  const router = Router();
  const requireAuth = createRequireAuth(ctx);
  const bookingLimiter = new TokenBucketRateLimiter(
    RATE_LIMITS.booking.limit,
    RATE_LIMITS.booking.windowMs,
  );

  router.post(
    "/",
    requireAuth,
    asyncHandler((req, res) => {
      const auth = getAuth(req);
      enforceRateLimit(bookingLimiter, auth.user.id, res);

      const body = asRecord(req.body);
      const booking = ctx.services.marketplace.createBooking(auth.user, {
        slotId: body.slotId,
        message: body.message,
      });

      res.status(201).json({ booking });
    }),
  );

  router.get("/", requireAuth, (req, res) => {
    res.status(200).json({ bookings: ctx.services.marketplace.listBookings(getAuth(req).user) });
  });

  router.post("/:id/accept", requireAuth, (req, res) => {
    const booking = ctx.services.marketplace.acceptBooking(
      getAuth(req).user,
      pathParam(req, "id"),
    );
    res.status(200).json({ booking });
  });

  router.post("/:id/decline", requireAuth, (req, res) => {
    const booking = ctx.services.marketplace.declineBooking(
      getAuth(req).user,
      pathParam(req, "id"),
    );
    res.status(200).json({ booking });
  });

  router.post("/:id/cancel", requireAuth, (req, res) => {
    const booking = ctx.services.marketplace.cancelBooking(
      getAuth(req).user,
      pathParam(req, "id"),
    );
    res.status(200).json({ booking });
  });

  return router;
}
