import type { ManagedRole } from "../types";

interface ManagedRoleConfig {
  /** Server URL segment for the directory: /auth/users/{apiSegment}. */
  apiSegment: string;
  /** Server URL segment for provisioning: POST /auth/users/{inviteSegment}. */
  inviteSegment: string;
  /** Client route of the management screen (must match app/router.tsx). */
  path: string;
  /** Key prefix in the `users` i18n namespace for the screen's title/description. */
  i18nKey: string;
}

/** Single source of per-role differences for the user-management screens. */
export const MANAGED_ROLES: Record<ManagedRole, ManagedRoleConfig> = {
  ADMIN: { apiSegment: "admins", inviteSegment: "admin", path: "/admins", i18nKey: "admins" },
  EMPLOYEE: { apiSegment: "employees", inviteSegment: "employee", path: "/employees", i18nKey: "employees" },
};
