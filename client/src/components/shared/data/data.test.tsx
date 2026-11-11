import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import { renderWithProviders } from "@/test/render";
import { Pagination } from "./Pagination";
import { IconActionButton } from "./IconActionButton";

describe("Pagination", () => {
  const base = { totalPages: 3, total: 60, onPrev: vi.fn(), onNext: vi.fn() };

  it("disables Previous on the first page", () => {
    renderWithProviders(<Pagination {...base} page={1} />);
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Total: 60")).toBeInTheDocument();
  });

  it("disables Next on the last page and while fetching", () => {
    const { rerender } = renderWithProviders(<Pagination {...base} page={3} />);
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    rerender(<Pagination {...base} page={2} isFetching />);
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
  });

  it("calls onNext", async () => {
    const onNext = vi.fn();
    const { user } = renderWithProviders(<Pagination {...base} page={1} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});

describe("IconActionButton", () => {
  it("has an accessible name and fires onClick", async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(
      <IconActionButton icon={Trash2} label="Delete" tone="destructive" onClick={onClick} />
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled while loading", () => {
    renderWithProviders(<IconActionButton icon={Trash2} label="Delete" loading />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
