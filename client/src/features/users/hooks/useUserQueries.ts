import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usersApi } from "../api/users.api";
import { userKeys } from "../api/users.keys";
import type { InviteUserInput, ManagedRole } from "../types";

export const USERS_PAGE_SIZE = 25;
export const ACTIVITY_PAGE_SIZE = 20;
// Every audit-log read is itself audited server-side; avoid refetch noise.
const ACTIVITY_STALE_MS = 60_000;

/** Paginated + searchable list of users of a role. keepPreviousData avoids flashing while paging. */
export function useUsersQuery(role: ManagedRole, params: { page: number; search: string }) {
  return useQuery({
    queryKey: userKeys.list(role, params),
    queryFn: () =>
      usersApi.list(role, {
        page: params.page,
        pageSize: USERS_PAGE_SIZE,
        search: params.search || undefined,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useUserQuery(role: ManagedRole, id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(role, id ?? ""),
    queryFn: () => usersApi.get(role, id!),
    enabled: !!id,
  });
}

export function useUserActivityQuery(
  userId: string | undefined,
  page: number,
  { enabled = true }: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: userKeys.activity(userId ?? "", page),
    queryFn: () => usersApi.activity(userId!, { page, pageSize: ACTIVITY_PAGE_SIZE }),
    enabled: enabled && !!userId,
    staleTime: ACTIVITY_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useDeactivateUserMutation(role: ManagedRole) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(role, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.byRole(role) }),
  });
}

export function useInviteUserMutation(role: ManagedRole) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => usersApi.invite(role, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.byRole(role) }),
  });
}
