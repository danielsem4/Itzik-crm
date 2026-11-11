/**
 * Password hashing + policy.
 *
 * bcrypt at the configured cost; length bounds respect bcrypt's 72-byte input
 * truncation. Plaintext passwords are never logged.
 */
import bcrypt from "bcrypt";
import { securityPolicy } from "../../config";
import { ValidationError } from "../errors";

/** Enforce the password policy; throws ValidationError (never echoes the value). */
export function assertPasswordPolicy(plain: string): void {
  if (typeof plain !== "string" || plain.length < securityPolicy.passwordMinLength) {
    throw new ValidationError(
      `Password must be at least ${securityPolicy.passwordMinLength} characters`
    );
  }
  if (plain.length > securityPolicy.passwordMaxLength) {
    throw new ValidationError(
      `Password must be at most ${securityPolicy.passwordMaxLength} characters`
    );
  }
}

/** Hash a policy-valid password with bcrypt at the configured cost. */
export async function hashPassword(plain: string): Promise<string> {
  assertPasswordPolicy(plain);
  return bcrypt.hash(plain, securityPolicy.bcryptCost);
}

/** Verify a plaintext password against a bcrypt hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Cached dummy hash so the "no such user" path spends the same time as a real
// bcrypt comparison — defeats a timing oracle for user enumeration.
let dummyHash: string | null = null;

/** Perform a throwaway bcrypt comparison to equalize timing when no user matches. */
export async function dummyVerify(plain: string): Promise<void> {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash("timing-equalizer", securityPolicy.bcryptCost);
  }
  await bcrypt.compare(plain, dummyHash);
}
