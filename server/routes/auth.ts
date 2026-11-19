import { Router } from "express";
import { RATE_LIMITS } from "../../shared/constants.js";
import { usernameKey } from "../../shared/validation.js";
import type { AppContext } from "../context.js";
import {
  asyncHandler,
  asRecord,
  clearSessionCookie,
  clientIp,
  createRequireAuth,
  enforceRateLimit,
  getAuth,
  getSessionToken,
  setSessionCookie,
} from "../http.js";
import { TokenBucketRateLimiter } from "../rate-limit.js";
import { toPublicUser } from "../services/auth.js";

export function createAuthRouter(ctx: AppContext): Router {
  const router = Router();
  const loginLimiter = new TokenBucketRateLimiter(
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs,
  );
  const registerLimiter = new TokenBucketRateLimiter(
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowMs,
  );
  const requireAuth = createRequireAuth(ctx);

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      enforceRateLimit(registerLimiter, clientIp(req), res);

      const body = asRecord(req.body);
      const result = await ctx.services.auth.register({
        username: body.username,
        password: body.password,
        email: body.email,
        role: body.role,
        mentorProfile: body.mentorProfile,
      });

      setSessionCookie(res, ctx.config, result.token, result.expiresAt);
      res.status(201).json({ user: result.user });
    }),
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const body = asRecord(req.body);
      const key = `${clientIp(req)}|${
        typeof body.username === "string" ? usernameKey(body.username) : "unknown"
      }`;
      enforceRateLimit(loginLimiter, key, res);

      const result = await ctx.services.auth.login({
        username: body.username,
        password: body.password,
      });

      setSessionCookie(res, ctx.config, result.token, result.expiresAt);
      res.status(200).json({ user: result.user });
    }),
  );

  router.post(
    "/logout",
    asyncHandler((req, res) => {
      ctx.services.auth.logout(getSessionToken(req));
      clearSessionCookie(res, ctx.config);
      res.status(204).end();
    }),
  );

  router.get("/me", requireAuth, (req, res) => {
    res.status(200).json({ user: toPublicUser(getAuth(req).user) });
  });

  return router;
}
