import type { Role } from "../types";

/**
 * Client-side mirror of the server permission catalog (server
 * shared/authz/roles.ts), used ONLY to decide what to show in the UI. It is NOT
 * an authorization boundary — every action is authorized server-side. Keep this
 * in sync with the server map; the server remains the source of truth.
 */
export const PERMISSIONS = {
  EMPLOYEE_CREATE: "EMPLOYEE_CREATE",
  EMPLOYEE_MANAGE: "EMPLOYEE_MANAGE",
  ADMIN_CREATE: "ADMIN_CREATE",
  ADMIN_MANAGE: "ADMIN_MANAGE",
  AUDIT_LOG_READ: "AUDIT_LOG_READ",
  SECURITY_SETTINGS_MANAGE: "SECURITY_SETTINGS_MANAGE",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const EMPLOYEE: Permission[] = [];
const ADMIN: Permission[] = [
  ...EMPLOYEE,
  PERMISSIONS.EMPLOYEE_CREATE,
  PERMISSIONS.EMPLOYEE_MANAGE,
];
const SUPER_ADMIN: Permission[] = [
  ...ADMIN,
  PERMISSIONS.ADMIN_CREATE,
  PERMISSIONS.ADMIN_MANAGE,
  PERMISSIONS.AUDIT_LOG_READ,
  PERMISSIONS.SECURITY_SETTINGS_MANAGE,
];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  EMPLOYEE: new Set(EMPLOYEE),
  ADMIN: new Set(ADMIN),
  SUPER_ADMIN: new Set(SUPER_ADMIN),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
