import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { USERS_PAGE_SIZE, useUsersQuery } from "./useUserQueries";
import type { ManagedRole } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * State + data for a user-management list: debounced search, paging (reset to
 * page 1 whenever the search term changes), and derived counts.
 */
export function useUsersList(role: ManagedRole) {
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Any change of the (debounced) term restarts at page 1. Adjusting state
  // during render (instead of in an effect) avoids fetching the stale page first.
  const [paging, setPaging] = useState({ term, page: 1 });
  if (paging.term !== term) setPaging({ term, page: 1 });
  const page = paging.term === term ? paging.page : 1;

  const query = useUsersQuery(role, { page, search: term });
  const users = query.data?.users ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

  return {
    search,
    setSearch,
    page,
    totalPages,
    total,
    users,
    // Status counts come from the loaded page (the API only returns a total).
    activeCount: users.filter((u) => u.status === "ACTIVE").length,
    invitedCount: users.filter((u) => u.status === "INVITED").length,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    goPrev: () => setPaging({ term, page: Math.max(1, page - 1) }),
    goNext: () => setPaging({ term, page: Math.min(totalPages, page + 1) }),
  };
}
