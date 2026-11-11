import { hasPermission } from "./roles";
import type { Permission } from "./permissions";
import type { Role } from "@prisma/client";

/** The minimum shape of an authenticated actor the ownership check needs. */
export interface ActorContext {
  id: string;
  role: Role;
}

/** The minimum shape of an owned resource: it knows who owns it. */
export interface OwnedResource {
  ownerId: string;
}

/**
 * Owner-scoped management with administrative override. Pure and permission-driven — no role literals:
 *
 *   canManageResource(actor, resource, { managePermission, manageAnyPermission })
 *     = actor holds `manageAnyPermission`               // ADMIN / SUPER_ADMIN override
 *       OR (actor holds `managePermission` AND actor owns the resource)
 *
 * Shared/global content does NOT imply globally shared write access: an EMPLOYEE
 * may modify only the records they own; ADMIN and SUPER_ADMIN carry the
 * `*_MANAGE_ANY` override. Enforced server-side; covered by negative tests.
 */
export function canManageResource(
  actor: ActorContext,
  resource: OwnedResource,
  perms: { managePermission: Permission; manageAnyPermission: Permission },
): boolean {
  if (hasPermission(actor.role, perms.manageAnyPermission)) {
    return true;
  }
  return (
    hasPermission(actor.role, perms.managePermission) &&
    resource.ownerId === actor.id
  );
}
