import { z } from "zod";
import type { TFunction } from "i18next";

/** Mirrors server `securityPolicy.passwordMinLength`. The single client-side source. */
export const PASSWORD_MIN_LENGTH = 12;

/*
 * Schemas are factories taking `t` so validation messages are localized and
 * follow language changes (memoize with `useMemo(() => create…Schema(t), [t])`).
 */

const required = (t: TFunction) => z.string().trim().min(1, t("common:validation.required"));

const email = (t: TFunction) => required(t).email(t("common:validation.email"));

const newPassword = (t: TFunction) =>
  z
    .string()
    .min(PASSWORD_MIN_LENGTH, t("common:validation.minLength", { min: PASSWORD_MIN_LENGTH }));

export const createLoginSchema = (t: TFunction) =>
  z.object({
    email: email(t),
    // Not trimmed / no policy: the server decides whether credentials are valid.
    password: z.string().min(1, t("common:validation.required")),
  });
export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;

export const createForgotPasswordSchema = (t: TFunction) => z.object({ email: email(t) });
export type ForgotPasswordValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export const createSetPasswordSchema = (t: TFunction) =>
  z
    .object({ password: newPassword(t), confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      path: ["confirm"],
      message: t("common:validation.passwordMismatch"),
    });
export type SetPasswordValues = z.infer<ReturnType<typeof createSetPasswordSchema>>;

export const createChangePasswordSchema = (t: TFunction) =>
  z
    .object({
      current: z.string().min(1, t("common:validation.required")),
      next: newPassword(t),
      confirm: z.string(),
    })
    .refine((v) => v.next === v.confirm, {
      path: ["confirm"],
      message: t("common:validation.passwordMismatch"),
    });
export type ChangePasswordValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;
