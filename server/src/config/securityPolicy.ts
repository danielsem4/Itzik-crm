/**
 * Centralized security-policy values (lifetimes, thresholds, token sizes).
 *
 * Every auth/session/reset/invitation value MUST be read from here — no
 * magic numbers scattered through the application:
 * changing a value is a visible edit to this file, reviewable in one place.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const securityPolicy = {
  // --- Session lifetimes (Strict profile, opaque server-side sessions) ---
  /** Idle timeout: session invalid if `now - lastSeenAt` exceeds this. */
  sessionIdleMs: 30 * MINUTE,
  /** Absolute cap: session invalid if `now - createdAt` exceeds this. */
  sessionAbsoluteMs: 8 * HOUR,
  /** Recent-auth window for sensitive actions (step-up if exceeded). */
  recentAuthMs: 5 * MINUTE,

  // --- Tokens (invitation / password reset) ---
  /** Invitation/activation token validity window. */
  invitationTtlMs: 72 * HOUR,
  /** Password-reset token validity window. */
  passwordResetTtlMs: 60 * MINUTE,

  // --- Passwords (bcrypt) ---
  /** bcrypt cost factor. */
  bcryptCost: 12,
  /** Minimum password length. */
  passwordMinLength: 12,
  /** Maximum password length (bcrypt truncates input beyond 72 bytes). */
  passwordMaxLength: 72,

  // --- Random token sizes (bytes of CSPRNG entropy; >=16 = >=128 bits) ---
  /** Opaque session token (raw in cookie; SHA-256 hash in DB). */
  sessionTokenBytes: 32,
  /** Password-reset token (raw in email link; SHA-256 hash in DB). */
  resetTokenBytes: 32,
  /** Invitation/activation token (raw in email link; SHA-256 hash in DB). */
  invitationTokenBytes: 32,
  /** Per-session synchronizer CSRF token. */
  csrfTokenBytes: 32,

  // --- Session cookie ---
  /**
   * Cookie name. `__Host-` prefix requires Secure + Path=/ + no Domain, which
   * the browser enforces — only usable over HTTPS, so a plain name is used in
   * non-production (where Secure is off).
   */
  sessionCookieName: (isProduction: boolean): string =>
    isProduction ? "__Host-session" : "session",
} as const;

export type SecurityPolicy = typeof securityPolicy;
