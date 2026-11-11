/**
 * CSRF protection for cookie-authenticated, state-changing requests
 *.
 *
 * Synchronizer Token Pattern: a random per-session CSRF token (stashed on the
 * request by `authenticate` as `req.sessionCsrfToken`) must be echoed by the SPA
 * in the `X-CSRF-Token` header on every state-changing request, and is compared
 * in constant time. Origin/Referer must also match the trusted client origin.
 * `SameSite=Lax` on the cookie is defense in depth, never the sole control. GET
 * (and other safe methods) are never state-changing and are skipped.
 */
import type { RequestHandler } from "express";
import { ForbiddenError } from "../errors";
import { constantTimeEquals } from "../utils/tokens";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "x-csrf-token";

export interface CsrfDeps {
  /** Trusted browser origin (config.clientUrl). */
  clientUrl: string;
}

export function createCsrf(deps: CsrfDeps): RequestHandler {
  const allowedOrigin = new URL(deps.clientUrl).origin;
  return (req, _res, next): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    // 1) Origin/Referer must match the trusted client origin.
    const source = req.get("origin") ?? req.get("referer");
    if (!source || !originMatches(source, allowedOrigin)) {
      next(new ForbiddenError("Cross-origin request blocked"));
      return;
    }

    // 2) Synchronizer token must match the session's CSRF token.
    const presented = req.get(CSRF_HEADER) ?? "";
    const expected = req.sessionCsrfToken ?? "";
    if (!expected || !presented || !constantTimeEquals(presented, expected)) {
      next(new ForbiddenError("Invalid CSRF token"));
      return;
    }

    next();
  };
}

function originMatches(source: string, allowedOrigin: string): boolean {
  try {
    return new URL(source).origin === allowedOrigin;
  } catch {
    return false;
  }
}
