import { describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import { createInviteUserSchema } from "./invite.schema";

const schema = createInviteUserSchema(i18n.getFixedT("en"));
const valid = { firstName: "Dana", lastName: "Levi", email: "dana@example.com", phone: "+972 50-123-4567" };

describe("invite schema (mirrors server inviteSchema)", () => {
  it("accepts a valid invite", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it.each(["---", "12345", "+1 234 567 890 123 456", "050-abc-1234"])("rejects phone %s", (phone) => {
    const result = schema.safeParse({ ...valid, phone });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.phone).toContain("Enter a valid phone number.");
  });

  it("requires names and trims whitespace-only input", () => {
    expect(schema.safeParse({ ...valid, firstName: "   " }).success).toBe(false);
  });
});
