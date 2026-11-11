import type { NextFunction, Request, Response } from "express";
import { AppError, ERROR_CODES, type ErrorCode } from "../errors";
import { logger, serializeError } from "../utils/logger";

/**
 * Central Express error handler.
 *
 * Contract:
 * - Expected `AppError`s are returned with their own status/code/message.
 * - Known infrastructure errors (body-parser size/parse failures, recognized
 *   Prisma errors) are mapped to safe, generic responses.
 * - Everything else is an UNEXPECTED fault: the full error (incl. stack) is
 *   logged server-side, and the client receives only a generic 500. Stack
 *   traces, Prisma internals, SQL, filesystem paths, env values, and raw
 *   exception messages are NEVER sent to the client.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If the response has already started, defer to Express's default handling.
  if (res.headersSent) {
    next(err);
    return;
  }

  const mapped = mapError(err);

  if (mapped) {
    // Log expected errors at a low level for observability, without stack noise.
    logger.warn("handled_error", {
      code: mapped.code,
      status: mapped.status,
      method: req.method,
      path: req.path,
    });
    res.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
    });
    return;
  }

  // Unexpected: log everything server-side, expose nothing.
  logger.error("unhandled_error", {
    method: req.method,
    path: req.path,
    ...serializeError(err),
  });
  res.status(500).json({
    error: { code: ERROR_CODES.INTERNAL, message: "Internal server error" },
  });
}

interface MappedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Translate a known error into a safe client response, or return `null` to
 * signal "unexpected — collapse to a generic 500".
 */
function mapError(err: unknown): MappedError | null {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (typeof err === "object" && err !== null) {
    const e = err as {
      type?: string;
      status?: number;
      statusCode?: number;
      name?: string;
      code?: string;
    };

    // body-parser (express.json / urlencoded) errors — duck-typed by `type`.
    if (e.type === "entity.too.large") {
      return {
        status: 413,
        code: ERROR_CODES.PAYLOAD_TOO_LARGE,
        message: "Request payload too large",
      };
    }
    if (
      e.type === "entity.parse.failed" ||
      (e.name === "SyntaxError" && (e.status === 400 || e.statusCode === 400))
    ) {
      return {
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message: "Malformed request body",
      };
    }

    // Recognized Prisma errors → safe, generic messages (never leak Prisma meta).
    if (e.name === "PrismaClientKnownRequestError" && typeof e.code === "string") {
      if (e.code === "P2025") {
        return {
          status: 404,
          code: ERROR_CODES.NOT_FOUND,
          message: "Resource not found",
        };
      }
      if (e.code === "P2002") {
        return {
          status: 409,
          code: ERROR_CODES.CONFLICT,
          message: "Resource already exists",
        };
      }
    }
  }

  return null;
}
