import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormTextField, SubmitButton } from "@/components/shared";
import { toastApiError } from "@/lib/notify";
import { AuthShell } from "../components/AuthShell";
import { useForgotPasswordMutation } from "../hooks/useAuthMutations";
import {
  createForgotPasswordSchema,
  type ForgotPasswordValues,
} from "../schemas/auth.schemas";

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const forgot = useForgotPasswordMutation();
  const [sent, setSent] = useState(false);
  const schema = useMemo(() => createForgotPasswordSchema(t), [t]);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  function onSubmit({ email }: ForgotPasswordValues) {
    forgot.mutate(email, {
      // Non-enumerating: always show the same confirmation.
      onSuccess: () => setSent(true),
      onError: toastApiError,
    });
  }

  return (
    <AuthShell title={t("forgot.title")} description={t("forgot.subtitle")}>
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("forgot.sent")}</p>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/login">{t("forgot.backToLogin")}</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
            <FormTextField
              control={form.control}
              name="email"
              type="email"
              label={t("fields.email")}
              autoComplete="email"
            />
            <SubmitButton pending={forgot.isPending} size="lg" className="w-full">
              {t("forgot.submit")}
            </SubmitButton>
            <div className="text-center text-sm">
              <Link to="/login" className="text-primary transition-colors hover:underline">
                {t("forgot.backToLogin")}
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthShell>
  );
}
