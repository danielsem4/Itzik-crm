/**
 * `requireRecentAuth` — step-up guard for sensitive actions
 *. If the principal's last full login
 * is older than the window, respond 403 REAUTH_REQUIRED so the client prompts
 * for a fresh factor. Runs after `authenticate`.
 */
import type { RequestHandler } from "express";
import { UnauthenticatedError, ReauthRequiredError } from "../errors";
import { securityPolicy } from "../../config";

export function requireRecentAuth(
  maxAgeMs: number = securityPolicy.recentAuthMs
): RequestHandler {
  return (req, _res, next): void => {
    const principal = req.principal;
    if (!principal) {
      next(new UnauthenticatedError());
      return;
    }
    if (Date.now() - principal.authenticatedAt.getTime() > maxAgeMs) {
      next(new ReauthRequiredError());
      return;
    }
    next();
  };
}
