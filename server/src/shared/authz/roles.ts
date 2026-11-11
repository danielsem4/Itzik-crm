import { Role } from "@prisma/client";
import { PERMISSIONS, type Permission } from "./permissions";

/**
 * Central role → permission mapping (RBAC over SUPER_ADMIN | ADMIN | EMPLOYEE).
 * The matrix unit test (authz.test.ts) asserts every grant explicitly.
 *
 * Trust order: EMPLOYEE < ADMIN < SUPER_ADMIN. Each role is enumerated
 * explicitly so every grant is auditable. Deny-by-default.
 *
 * `Record<Role, …>` makes this exhaustive at compile time — adding a Role enum
 * value without a permission set here is a type error.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  [Role.EMPLOYEE]: new Set<Permission>([]),

  [Role.ADMIN]: new Set<Permission>([
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_MANAGE,
  ]),

  [Role.SUPER_ADMIN]: new Set<Permission>([
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.ADMIN_CREATE,
    PERMISSIONS.ADMIN_MANAGE,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SECURITY_SETTINGS_MANAGE,
  ]),
};

/** True iff `role` is granted `permission`. Deny-by-default. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** The full permission set for a role (read-only copy). */
export function permissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? new Set<Permission>())];
}
