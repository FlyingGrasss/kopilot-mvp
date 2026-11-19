import { Router } from "express";
import {
  validateExamFilter,
  validateMaxPrice,
  validateSubjectFilter,
  type Validated,
} from "../../shared/validation.js";
import type { AppContext } from "../context.js";
import { notFound, validationError } from "../errors.js";
import { asyncHandler, firstQuery, pathParam } from "../http.js";

function unwrap<T>(result: Validated<T>): T {
  if (!result.ok) throw validationError(result.error.field, result.error.message);
  return result.value;
}

export function createMentorsRouter(ctx: AppContext): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler((req, res) => {
      const exam = unwrap(validateExamFilter(firstQuery(req.query.exam)));
      const subject = unwrap(validateSubjectFilter(firstQuery(req.query.subject)));
      const maxPrice = unwrap(validateMaxPrice(firstQuery(req.query.maxPrice)));

      const mentors = ctx.services.marketplace.listMentors({
        ...(exam ? { exam } : {}),
        ...(subject ? { subject } : {}),
        ...(maxPrice !== undefined ? { maxPrice } : {}),
      });

      res.status(200).json({ mentors });
    }),
  );

  router.get(
    "/:id",
    asyncHandler((req, res) => {
      const mentor = ctx.services.marketplace.getMentor(pathParam(req, "id"));
      if (!mentor) throw notFound("Mentor bulunamadı.");
      res.status(200).json({ mentor });
    }),
  );

  return router;
}
