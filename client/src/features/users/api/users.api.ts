import { apiClient } from "@/lib/apiClient";
import type { User } from "@/features/auth";
import { MANAGED_ROLES } from "../lib/roles";
import type {
  ActivityResponse,
  InviteUserInput,
  ListUsersParams,
  ManagedRole,
  UserDetail,
  UserListResponse,
} from "../types";

const base = (role: ManagedRole) => `/auth/users/${MANAGED_ROLES[role].apiSegment}`;

export const usersApi = {
  async list(role: ManagedRole, params: ListUsersParams): Promise<UserListResponse> {
    const { data } = await apiClient.get<UserListResponse>(base(role), { params });
    return data;
  },

  async get(role: ManagedRole, id: string): Promise<UserDetail> {
    const { data } = await apiClient.get<{ user: UserDetail }>(`${base(role)}/${id}`);
    return data.user;
  },

  async deactivate(role: ManagedRole, id: string): Promise<User> {
    const { data } = await apiClient.post<{ user: User }>(`${base(role)}/${id}/deactivate`);
    return data.user;
  },

  /** A user's own actions from the audit log. SUPER_ADMIN only (AUDIT_LOG_READ); each read is audited. */
  async activity(
    userId: string,
    params: { page: number; pageSize: number }
  ): Promise<ActivityResponse> {
    const { data } = await apiClient.get<ActivityResponse>("/audit-logs", {
      params: { actorUserId: userId, ...params },
    });
    return data;
  },

  /** Provision (invite) a user; the role is fixed by the endpoint, never sent in the body. */
  async invite(role: ManagedRole, input: InviteUserInput): Promise<User> {
    const { data } = await apiClient.post<{ user: User }>(
      `/auth/users/${MANAGED_ROLES[role].inviteSegment}`,
      input
    );
    return data.user;
  },
};
