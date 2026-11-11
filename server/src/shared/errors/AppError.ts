import { ERROR_CODES, ERROR_STATUS, type ErrorCode } from "./errorCodes";

/**
 * Base class for all *expected* (operational) errors — the ones we deliberately
 * throw to signal a known outcome (bad input, missing resource, forbidden, …).
 *
 * The central `errorHandler` maps an `AppError` to its `statusCode` and returns
 * `{ error: { code, message, details? } }`. Because these fields are chosen by
 * us, they are safe to expose to clients. Anything NOT an `AppError` is treated
 * as an unexpected internal fault and collapsed to a generic 500
 *.
 *
 * `details` is optional and must contain only safe, client-appropriate data
 * (e.g. Zod field errors) — never internal state or secrets.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  /** Marks this as a deliberate, safe-to-expose error (vs. an unexpected crash). */
  readonly isOperational = true;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { statusCode?: number; details?: unknown }
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = options?.statusCode ?? ERROR_STATUS[code];
    this.details = options?.details;
    // Preserve prototype chain when compiled to ES2020/CommonJS.
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}

/**
 * Positional-signature error used by the ported source/parsing/chunking modules.
 * Those modules were written against a `(message, statusCode, code)` convention;
 * this subclass preserves it while remaining a first-class `AppError` (operational,
 * mapped by the central error handler). `code` defaults to BAD_REQUEST for the few
 * call sites that only supply a message + status.
 */
export class DomainError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode = ERROR_CODES.BAD_REQUEST
  ) {
    super(code, message, { statusCode });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(ERROR_CODES.VALIDATION, message, { details });
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(ERROR_CODES.BAD_REQUEST, message, { details });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super(ERROR_CODES.UNAUTHENTICATED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(ERROR_CODES.FORBIDDEN, message);
  }
}

export class ReauthRequiredError extends AppError {
  constructor(message = "Recent authentication required for this action") {
    super(ERROR_CODES.REAUTH_REQUIRED, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(ERROR_CODES.NOT_FOUND, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(ERROR_CODES.CONFLICT, message, { details });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Request payload too large") {
    super(ERROR_CODES.PAYLOAD_TOO_LARGE, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(ERROR_CODES.RATE_LIMITED, message);
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(ERROR_CODES.INTERNAL, message);
  }
}
