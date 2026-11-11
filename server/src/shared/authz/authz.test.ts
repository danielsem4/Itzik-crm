import { test } from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  permissionsForRole,
  type Permission,
} from "./index";

/**
 * Executable role→permission matrix. `true` = granted, false = denied
 * (deny-by-default). Update this table whenever ./roles.ts changes.
 */
const MATRIX: Record<Role, Record<Permission, boolean>> = {
  [Role.EMPLOYEE]: {
    EMPLOYEE_CREATE: false,
    EMPLOYEE_MANAGE: false,
    ADMIN_CREATE: false,
    ADMIN_MANAGE: false,
    AUDIT_LOG_READ: false,
    SECURITY_SETTINGS_MANAGE: false,
  },
  [Role.ADMIN]: {
    EMPLOYEE_CREATE: true,
    EMPLOYEE_MANAGE: true,
    ADMIN_CREATE: false,
    ADMIN_MANAGE: false,
    AUDIT_LOG_READ: false,
    SECURITY_SETTINGS_MANAGE: false,
  },
  [Role.SUPER_ADMIN]: {
    EMPLOYEE_CREATE: true,
    EMPLOYEE_MANAGE: true,
    ADMIN_CREATE: true,
    ADMIN_MANAGE: true,
    AUDIT_LOG_READ: true,
    SECURITY_SETTINGS_MANAGE: true,
  },
};

test("hasPermission matches the matrix for every role × permission", () => {
  for (const role of Object.values(Role)) {
    for (const permission of ALL_PERMISSIONS) {
      const expected = MATRIX[role][permission];
      assert.equal(
        hasPermission(role, permission),
        expected,
        `${role} ${expected ? "should" : "should NOT"} have ${permission}`,
      );
    }
  }
});

test("the matrix covers exactly the permission catalog (no drift)", () => {
  for (const role of Object.values(Role)) {
    assert.deepEqual(Object.keys(MATRIX[role]).sort(), [...ALL_PERMISSIONS].sort());
  }
});

test("SUPER_ADMIN has every permission in the catalog", () => {
  assert.equal(permissionsForRole(Role.SUPER_ADMIN).length, ALL_PERMISSIONS.length);
});

test("every Role has an entry in ROLE_PERMISSIONS", () => {
  for (const role of Object.values(Role)) {
    assert.ok(ROLE_PERMISSIONS[role] instanceof Set, `${role} has a permission set`);
  }
});
