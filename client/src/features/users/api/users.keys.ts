import type { ManagedRole } from "../types";

/** TanStack Query keys for the users feature. Invalidate via these only. */
export const userKeys = {
  all: ["users"] as const,
  byRole: (role: ManagedRole) => [...userKeys.all, role] as const,
  list: (role: ManagedRole, params: { page: number; search: string }) =>
    [...userKeys.byRole(role), "list", params] as const,
  detail: (role: ManagedRole, id: string) => [...userKeys.byRole(role), "detail", id] as const,
  activity: (id: string, page: number) => [...userKeys.all, "activity", id, page] as const,
};
