import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { renderWithProviders } from "@/test/render";
import { FormTextField } from "./FormTextField";
import { SubmitButton } from "./SubmitButton";

const schema = z.object({ email: z.string().email("Bad email"), password: z.string().min(1, "Required") });
type Values = z.infer<typeof schema>;

function TestForm({ onSubmit }: { onSubmit: (v: Values) => void }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormTextField control={form.control} name="email" type="email" label="Email" />
        <FormTextField control={form.control} name="password" type="password" label="Password" />
        <SubmitButton pending={false}>Go</SubmitButton>
      </form>
    </Form>
  );
}

describe("FormTextField", () => {
  it("shows schema errors, marks fields invalid, and does not submit", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithProviders(<TestForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(await screen.findByText("Bad email")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders a password toggle for type=password and submits valid values", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithProviders(<TestForm onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co", password: "secret" }, expect.anything());
  });
});
