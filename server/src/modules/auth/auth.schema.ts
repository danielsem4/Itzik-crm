/**
 * Zod request schemas. All `.strict()` so
 * unknown fields are rejected — notably, no endpoint accepts a `role` field, so
 * a role can never be mass-assigned; the target role is fixed by the route.
 */
import { z } from "zod";
import { securityPolicy } from "../../config";

const email = z.string().trim().toLowerCase().email().max(254);
const newPassword = z
  .string()
  .min(securityPolicy.passwordMinLength)
  .max(securityPolicy.passwordMaxLength);

export const loginSchema = z
  .object({ email, password: z.string().min(1).max(securityPolicy.passwordMaxLength) })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({ token: z.string().min(1), password: newPassword })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword })
  .strict();

export const activateSchema = z
  .object({ token: z.string().min(1), password: newPassword })
  .strict();

// Invitation: role is NOT a field — it is fixed by the endpoint (see routes).
// `name` is derived server-side from firstName + lastName (not accepted here).
export const inviteSchema = z
  .object({
    email,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    // Phone: digits, spaces, and + - ( ) only, with 7-15 actual digits (E.164
    // max is 15) so separator-only junk like "---" is rejected.
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+()\-\s\d]+$/)
      .refine((v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 7 && digits <= 15;
      }),
  })
  .strict();

export const revokeSessionSchema = z.object({ sessionId: z.string().min(1) }).strict();

// User directory listing: role is fixed by the route, never a query field.
export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(200).optional(),
  })
  .strict();
