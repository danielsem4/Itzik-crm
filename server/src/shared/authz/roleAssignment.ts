import { Role } from "@prisma/client";

/**
 * Privilege-escalation guard for user creation/modification.
 *
 * This answers a different question than the permission catalog: not "may the
 * actor manage users?" (EMPLOYEE_CREATE / ADMIN_CREATE etc.) but "which role
 * VALUE may the actor assign to a target account?". Both checks must pass.
 *
 * Invariants:
 *  - No actor — not even SUPER_ADMIN — may assign SUPER_ADMIN through any API.
 *    The single SUPER_ADMIN is provisioned only via the bootstrap CLI.
 *  - SUPER_ADMIN may assign ADMIN or EMPLOYEE.
 *  - ADMIN may assign EMPLOYEE only.
 *  - EMPLOYEE cannot manage users or roles.
 *
 * Client-supplied role values are never trusted: the role written to a new/
 * updated account must be validated through `canAssignRole` on the server.
 */
const ASSIGNABLE_BY: Record<Role, ReadonlySet<Role>> = {
  [Role.SUPER_ADMIN]: new Set<Role>([Role.ADMIN, Role.EMPLOYEE]),
  [Role.ADMIN]: new Set<Role>([Role.EMPLOYEE]),
  [Role.EMPLOYEE]: new Set<Role>([]),
};

/** Roles `actorRole` is permitted to assign to another account. Never includes SUPER_ADMIN. */
export function assignableRoles(actorRole: Role): Role[] {
  return [...(ASSIGNABLE_BY[actorRole] ?? new Set<Role>())];
}

/** True iff `actorRole` may set a target account's role to `targetRole`. */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return ASSIGNABLE_BY[actorRole]?.has(targetRole) ?? false;
}
