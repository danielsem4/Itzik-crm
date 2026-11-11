/**
 * Named rate-limit policies. Attach to a route with `createRateLimiter(policy)`.
 * Values are conservative starting points; tune with real traffic.
 */

export interface RateLimitPolicy {
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  limit: number;
  /** Human description of what this protects (for docs/telemetry). */
  description: string;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const RATE_LIMIT_POLICIES = {
  /** Login and similar credential checks — throttle brute force / stuffing. */
  auth: {
    windowMs: 15 * MINUTE,
    limit: 10,
    description: "Authentication attempts (login)",
  },
  /** Password reset requests — throttle enumeration and email-bomb abuse. */
  passwordReset: {
    windowMs: HOUR,
    limit: 5,
    description: "Password reset requests",
  },
  /** Invitation acceptance / account activation attempts. */
  activation: {
    windowMs: HOUR,
    limit: 10,
    description: "Invitation acceptance / account activation attempts",
  },
  /** Expensive processing (uploads, parsing, pipeline runs, exports). */
  expensiveProcessing: {
    windowMs: HOUR,
    limit: 30,
    description: "Expensive processing (uploads, parsing, exports)",
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;
