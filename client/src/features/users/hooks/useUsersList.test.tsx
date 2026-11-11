import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithQuery } from "@/test/render";
import type { User } from "@/features/auth";
import { usersApi } from "../api/users.api";
import { useUsersList } from "./useUsersList";

vi.mock("../api/users.api", () => ({ usersApi: { list: vi.fn() } }));
const list = vi.mocked(usersApi.list);

const user = (id: string, status: User["status"]): User => ({
  id,
  email: `${id}@x.co`,
  name: id,
  firstName: null,
  lastName: null,
  role: "EMPLOYEE",
  status,
  createdAt: "2026-01-01T00:00:00.000Z",
});

beforeEach(() => {
  list.mockReset();
  list.mockResolvedValue({
    users: [user("a", "ACTIVE"), user("b", "INVITED"), user("c", "ACTIVE")],
    total: 60,
    page: 1,
    pageSize: 25,
  });
});

describe("useUsersList", () => {
  it("derives totals and per-page status counts", async () => {
    const { result } = renderHookWithQuery(() => useUsersList("EMPLOYEE"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(60);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.activeCount).toBe(2);
    expect(result.current.invitedCount).toBe(1);
    expect(list).toHaveBeenCalledWith("EMPLOYEE", { page: 1, pageSize: 25, search: undefined });
  });

  it("pages within bounds", async () => {
    const { result } = renderHookWithQuery(() => useUsersList("EMPLOYEE"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.goPrev());
    expect(result.current.page).toBe(1);
    act(() => result.current.goNext());
    expect(result.current.page).toBe(2);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith("EMPLOYEE", { page: 2, pageSize: 25, search: undefined })
    );
  });

  it("resets to page 1 when the debounced search term changes", async () => {
    const { result } = renderHookWithQuery(() => useUsersList("EMPLOYEE"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.goNext());
    expect(result.current.page).toBe(2);

    act(() => result.current.setSearch("dana"));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith("EMPLOYEE", { page: 1, pageSize: 25, search: "dana" })
    );
    expect(result.current.page).toBe(1);
  });

  it("stays on page 1 when the search is cleared again", async () => {
    const { result } = renderHookWithQuery(() => useUsersList("EMPLOYEE"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.goNext());
    act(() => result.current.setSearch("dana"));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith("EMPLOYEE", expect.objectContaining({ search: "dana" })));
    act(() => result.current.setSearch(""));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith("EMPLOYEE", { page: 1, pageSize: 25, search: undefined })
    );
    expect(result.current.page).toBe(1);
  });
});
