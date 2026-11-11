import type { User } from "@/features/auth";

/** The two roles that have a management screen (SUPER_ADMIN is never managed here). */
export type ManagedRole = "ADMIN" | "EMPLOYEE";

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/** Response envelope of GET /auth/users/{admins,employees}. */
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

/** Payload for provisioning a new user (role is fixed by the endpoint). */
export interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

/** Detail view of a managed user (GET /auth/users/{role}/:id). Never includes phone. */
export interface UserDetail extends User {
  invitedBy: { id: string; name: string } | null;
  /** Most recent session activity, or null if they never signed in. */
  lastActiveAt: string | null;
}

/** One audit-log row as exposed to the UI (no ip / user agent / metadata). */
export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  result: "SUCCESS" | "FAILURE";
  createdAt: string;
}

export interface ActivityResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
