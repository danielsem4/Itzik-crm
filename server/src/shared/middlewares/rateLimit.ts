import {
  ipKeyGenerator,
  rateLimit,
  type RateLimitRequestHandler,
  type Store,
} from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import type { RateLimitPolicy } from "../../config/rateLimitPolicies";
import { TooManyRequestsError } from "../errors";

/**
 * Reusable rate-limiting abstraction.
 *
 * `createRateLimiter` wraps `express-rate-limit` so the rest of the codebase
 * depends on OUR seam, not the library directly. This keeps two things swappable:
 *
 * 1. **Storage.** The default in-memory store is fine for a single dev process
 *    but does NOT share counts across instances. In production, pass a shared
 *    `store` (e.g. `rate-limit-redis`'s `RedisStore`, implementing the library's
 *    `Store` interface) so limits hold across horizontally-scaled instances.
 *    Wire it from config when the deployment topology (and Redis) is chosen.
 *
 * 2. **Error shape.** On limit, we forward a `TooManyRequestsError` to the
 *    central error handler so clients get the same `{ error: { code, message } }`
 *    envelope as every other error, instead of the library's default body.
 *
 * NOTE: no limiter is mounted on any route yet — the sensitive endpoints do not
 * exist. Attach `createRateLimiter(RATE_LIMIT_POLICIES.auth)` etc. when they do.
 */
export interface RateLimiterOptions {
  /** Shared store for horizontally-scaled instances (default: in-memory). */
  store?: Store;
  /**
   * Optional account/email/token dimension. When provided, the limiter keys by
   * BOTH the client IP and this value (e.g. login by email+IP), so one account
   * can't be brute-forced across IPs and one IP can't spray many accounts. The
   * selector reads a non-secret identifier off the request (never a raw token);
   * return `undefined` to fall back to IP-only keying for that request.
   */
  keySelector?: (req: Request) => string | undefined;
}

export function createRateLimiter(
  policy: RateLimitPolicy,
  options: RateLimiterOptions = {}
): RateLimitRequestHandler {
  const { store, keySelector } = options;
  return rateLimit({
    windowMs: policy.windowMs,
    limit: policy.limit,
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false, // no X-RateLimit-* headers
    // Key by client IP, optionally combined with an account/email/token
    // dimension via `keySelector` so limits are per-account, not just
    // per-address (defeats shared-NAT false positives and per-user abuse).
    keyGenerator: (req: Request): string => {
      const ipKey = ipKeyGenerator(req.ip ?? "");
      const dimension = keySelector?.(req);
      return dimension ? `${ipKey}:${dimension}` : ipKey;
    },
    handler: (_req: Request, _res: Response, next: NextFunction): void => {
      next(new TooManyRequestsError());
    },
    ...(store ? { store } : {}),
  });
}
