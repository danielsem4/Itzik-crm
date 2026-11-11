/**
 * Authorization contract (executable) — RBAC over SUPER_ADMIN | ADMIN | EMPLOYEE.
 *
 * PURE: no request/HTTP coupling. The `requirePermission(...)` / `requireRole(...)`
 * middleware in shared/middlewares consumes this catalog.
 */
export { PERMISSIONS, ALL_PERMISSIONS, type Permission } from "./permissions";
export {
  ROLE_PERMISSIONS,
  hasPermission,
  permissionsForRole,
} from "./roles";
export { assignableRoles, canAssignRole } from "./roleAssignment";
export {
  canManageResource,
  type ActorContext,
  type OwnedResource,
} from "./ownership";
