import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { FormTextField, SubmitButton } from "@/components/shared";
import { createLoginSchema, type LoginValues } from "../schemas/auth.schemas";

interface LoginCredentialsFormProps {
  defaultEmail?: string;
  onSubmit: (values: LoginValues) => Promise<void>;
}

/** Step 1 of sign-in: email + password. */
export function LoginCredentialsForm({ defaultEmail = "", onSubmit }: LoginCredentialsFormProps) {
  const { t } = useTranslation("auth");
  const schema = useMemo(() => createLoginSchema(t), [t]);
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail, password: "" },
  });
  const pending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormTextField
          control={form.control}
          name="email"
          type="email"
          label={t("fields.email")}
          autoComplete="username"
        />
        <FormTextField
          control={form.control}
          name="password"
          type="password"
          label={t("fields.password")}
          autoComplete="current-password"
        />
        <SubmitButton pending={pending} size="lg" className="w-full">
          {pending ? t("login.submitting") : t("login.submit")}
        </SubmitButton>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary transition-colors hover:underline">
            {t("login.forgot")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
