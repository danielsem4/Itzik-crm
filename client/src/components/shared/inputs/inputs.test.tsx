import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { PasswordInput } from "./PasswordInput";
import { SearchInput } from "./SearchInput";
import { LoadingButton } from "./LoadingButton";

describe("PasswordInput", () => {
  it("toggles visibility with an accessible button", async () => {
    const { user } = renderWithProviders(<PasswordInput aria-label="Password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

describe("SearchInput", () => {
  it("reports the typed value through onValueChange", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithProviders(
      <SearchInput aria-label="Search" value="" onValueChange={onValueChange} />
    );
    await user.type(screen.getByRole("searchbox", { name: "Search" }), "a");
    expect(onValueChange).toHaveBeenCalledWith("a");
  });
});

describe("LoadingButton", () => {
  it("is a non-submit button by default and disables while pending", () => {
    renderWithProviders(<LoadingButton pending>Save</LoadingButton>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
