/**
 * Zod request validation.
 *
 * Parses and REPLACES `req.body` with the validated/narrowed value, so handlers
 * receive only known fields. Schemas should be `.strict()` so unknown fields
 * (e.g. an injected `role`) are rejected rather than silently passed through.
 * Validation failures become a 400 VALIDATION AppError via the central handler.
 *
 * Only `req.body` is reassigned: in Express 5 `req.query`/`req.params` are
 * getters without setters, so query/params schemas are validated (to reject bad
 * input) but not written back.
 */
import type { RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationError } from "../errors";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next): void => {
    try {
      if (schemas.query) schemas.query.parse(req.query);
      if (schemas.params) schemas.params.parse(req.params);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError("Validation failed", err.flatten()));
        return;
      }
      next(err);
    }
  };
}
