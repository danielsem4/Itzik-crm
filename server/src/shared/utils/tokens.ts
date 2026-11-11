/**
 * Bearer-token primitives.
 *
 * Session / password-reset / invitation tokens are high-entropy CSPRNG random
 * values. The RAW token is only ever placed in a cookie or a one-time email
 * link; the database stores ONLY its SHA-256 hash. Lookups hash the presented
 * token and compare in constant time. A stored hash of a high-entropy random
 * token cannot be forged, so no signing secret is required.
 */
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** Generate a URL-safe opaque token with `bytes` of CSPRNG entropy (>=16 => >=128 bits). */
export function generateOpaqueToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex digest — the only form of a bearer token that is persisted. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time string comparison (guards against timing oracles on secrets). */
export function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // Length is compared first because timingSafeEqual requires equal-length
  // buffers; the hashes we compare are fixed-length, so this leaks nothing.
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
