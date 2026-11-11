import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";

describe("LoadingState", () => {
  it("exposes an accessible status with the default label", () => {
    renderWithProviders(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("uses a custom label when given", () => {
    renderWithProviders(<LoadingState label="Fetching users" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching users");
  });
});

describe("ErrorState", () => {
  it("shows the generic message and no retry by default", () => {
    renderWithProviders(<ErrorState />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(<ErrorState message="Boom" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    renderWithProviders(
      <EmptyState title="Nothing here" description="Add one" action={<button>Add</button>} />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  const base = {
    open: true,
    title: "Delete source?",
    description: "This is permanent.",
    confirmLabel: "Delete",
  };

  it("calls onConfirm without closing itself", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog {...base} onConfirm={onConfirm} onOpenChange={onOpenChange} />
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("This is permanent.");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("cancels via the default localized Cancel button", async () => {
    const onOpenChange = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog {...base} onConfirm={vi.fn()} onOpenChange={onOpenChange} />
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables both actions while pending", () => {
    renderWithProviders(
      <ConfirmDialog {...base} pending onConfirm={vi.fn()} onOpenChange={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
