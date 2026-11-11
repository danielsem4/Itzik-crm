import { z } from "zod";
import type { TFunction } from "i18next";

/** Mirrors the server inviteSchema (7–15 digits; digits, spaces and + - ( ) only). */
const PHONE_PATTERN = /^[+()\-\s\d]+$/;

export const createInviteUserSchema = (t: TFunction) => {
  const required = z.string().trim().min(1, t("common:validation.required"));
  return z.object({
    firstName: required.max(100),
    lastName: required.max(100),
    email: required.email(t("common:validation.email")),
    phone: required
      .max(30)
      .regex(PHONE_PATTERN, t("common:validation.phone"))
      .refine((v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 7 && digits <= 15;
      }, t("common:validation.phone")),
  });
};

export type InviteUserValues = z.infer<ReturnType<typeof createInviteUserSchema>>;
