import { describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import {
  PASSWORD_MIN_LENGTH,
  createChangePasswordSchema,
  createLoginSchema,
  createSetPasswordSchema,
} from "./auth.schemas";

const t = i18n.getFixedT("en");
const strong = "x".repeat(PASSWORD_MIN_LENGTH);

describe("auth schemas", () => {
  it("login requires a valid email and any non-empty password", () => {
    const schema = createLoginSchema(t);
    expect(schema.safeParse({ email: "a@b.co", password: "1" }).success).toBe(true);
    const bad = schema.safeParse({ email: "nope", password: "" });
    expect(bad.success).toBe(false);
    expect(bad.error?.flatten().fieldErrors).toEqual({
      email: ["Enter a valid email address."],
      password: ["This field is required."],
    });
  });

  it("set-password enforces the minimum length and matching confirmation", () => {
    const schema = createSetPasswordSchema(t);
    expect(schema.safeParse({ password: strong, confirm: strong }).success).toBe(true);
    expect(schema.safeParse({ password: "short", confirm: "short" }).error?.issues[0]?.message).toBe(
      `Use at least ${PASSWORD_MIN_LENGTH} characters.`
    );
    const mismatch = schema.safeParse({ password: strong, confirm: `${strong}!` });
    expect(mismatch.error?.issues[0]).toMatchObject({
      path: ["confirm"],
      message: "Passwords do not match.",
    });
  });

  it("change-password requires the current password", () => {
    const schema = createChangePasswordSchema(t);
    expect(schema.safeParse({ current: "", next: strong, confirm: strong }).success).toBe(false);
    expect(schema.safeParse({ current: "old", next: strong, confirm: strong }).success).toBe(true);
  });
});
