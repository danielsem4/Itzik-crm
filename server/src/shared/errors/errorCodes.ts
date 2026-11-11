/**
 * Stable, machine-readable error codes returned to clients in
 * `{ error: { code, message } }`. Codes are part of the API contract; the
 * accompanying `message` is human-facing and safe to display. Neither ever
 * carries stack traces, SQL, filesystem paths, or secrets
 *.
 */
export const ERROR_CODES = {
  VALIDATION: "VALIDATION",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  /** Authenticated, but a sensitive action needs a fresh login. */
  REAUTH_REQUIRED: "REAUTH_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",

} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Default HTTP status for each error code. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  [ERROR_CODES.VALIDATION]: 400,
  [ERROR_CODES.BAD_REQUEST]: 400,
  [ERROR_CODES.UNAUTHENTICATED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.REAUTH_REQUIRED]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 413,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.INTERNAL]: 500,
};
