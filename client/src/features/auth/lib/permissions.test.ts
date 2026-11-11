import { describe, expect, it } from "vitest";
import { PERMISSIONS, hasPermission, type Permission } from "./permissions";

// Pins the client mirror to server shared/authz/roles.ts. If this fails after a
// server change, update both sides together.
const EXPECTED: Record<"EMPLOYEE" | "ADMIN" | "SUPER_ADMIN", Permission[]> = {
  EMPLOYEE: [],
  ADMIN: ["EMPLOYEE_CREATE", "EMPLOYEE_MANAGE"],
  SUPER_ADMIN: Object.values(PERMISSIONS),
};

describe("client permission mirror", () => {
  for (const [role, granted] of Object.entries(EXPECTED)) {
    it(`${role} has exactly its catalog permissions`, () => {
      for (const p of Object.values(PERMISSIONS)) {
        expect(hasPermission(role as keyof typeof EXPECTED, p), `${role} / ${p}`).toBe(
          granted.includes(p)
        );
      }
    });
  }
});
