import { test } from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import { assignableRoles, canAssignRole } from "./index";

test("no actor may assign SUPER_ADMIN through any path", () => {
  for (const actor of Object.values(Role)) {
    assert.equal(canAssignRole(actor, Role.SUPER_ADMIN), false, `${actor} must not assign SUPER_ADMIN`);
    assert.ok(!assignableRoles(actor).includes(Role.SUPER_ADMIN));
  }
});

test("SUPER_ADMIN may assign ADMIN or EMPLOYEE (only)", () => {
  assert.equal(canAssignRole(Role.SUPER_ADMIN, Role.ADMIN), true);
  assert.equal(canAssignRole(Role.SUPER_ADMIN, Role.EMPLOYEE), true);
  assert.deepEqual(assignableRoles(Role.SUPER_ADMIN).sort(), [Role.ADMIN, Role.EMPLOYEE].sort());
});

test("ADMIN may assign EMPLOYEE only", () => {
  assert.equal(canAssignRole(Role.ADMIN, Role.EMPLOYEE), true);
  assert.equal(canAssignRole(Role.ADMIN, Role.ADMIN), false);
  assert.equal(canAssignRole(Role.ADMIN, Role.SUPER_ADMIN), false);
  assert.deepEqual(assignableRoles(Role.ADMIN), [Role.EMPLOYEE]);
});

test("EMPLOYEE cannot assign any role", () => {
  for (const target of Object.values(Role)) {
    assert.equal(canAssignRole(Role.EMPLOYEE, target), false);
  }
  assert.deepEqual(assignableRoles(Role.EMPLOYEE), []);
});
