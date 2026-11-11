/**
 * Permission catalog — the single source of truth for every named capability
 * the authorization layer can gate on. The role→permission mapping lives in
 * ./roles.ts and is bound to this catalog by the matrix unit test.
 *
 * Deny-by-default: a role has ONLY the permissions explicitly granted in the
 * mapping. A capability that is not in this catalog cannot be granted or checked.
 *
 * Ownership note: when business modules land, use the `<THING>_MANAGE`
 * (subject to ownership) / `<THING>_MANAGE_ANY` (administrative override) pair
 * together with `canManageResource` in ./ownership.ts.
 */
export const PERMISSIONS = {
  // User management
  EMPLOYEE_CREATE: "EMPLOYEE_CREATE",
  EMPLOYEE_MANAGE: "EMPLOYEE_MANAGE",
  ADMIN_CREATE: "ADMIN_CREATE",
  ADMIN_MANAGE: "ADMIN_MANAGE",

  // Security
  AUDIT_LOG_READ: "AUDIT_LOG_READ",
  SECURITY_SETTINGS_MANAGE: "SECURITY_SETTINGS_MANAGE",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every permission in the catalog, for exhaustiveness checks and tests. */
export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);
