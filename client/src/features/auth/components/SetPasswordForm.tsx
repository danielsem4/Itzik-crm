import { useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormTextField, SubmitButton } from "@/components/shared";
import { toastApiError } from "@/lib/notify";
import { AuthShell } from "./AuthShell";
import { useSetPasswordMutation } from "../hooks/useAuthMutations";
import {
  PASSWORD_MIN_LENGTH,
  createSetPasswordSchema,
  type SetPasswordValues,
} from "../schemas/auth.schemas";

/**
 * Shared token + new-password form for both password reset and account
 * activation (both take a single-use token from the email link and set a
 * password, then send the user to login).
 */
export function SetPasswordForm({ mode }: { mode: "reset" | "activate" }) {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const setPassword = useSetPasswordMutation(mode);
  const schema = useMemo(() => createSetPasswordSchema(t), [t]);
  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  function onSubmit({ password }: SetPasswordValues) {
    setPassword.mutate(
      { token, password },
      {
        onSuccess: () => {
          toast.success(t(`setPassword.${mode}Success`));
          navigate("/login", { replace: true });
        },
        onError: toastApiError,
      }
    );
  }

  return (
    <AuthShell title={t(`${mode}.title`)} description={t(`${mode}.subtitle`)}>
      {!token ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-destructive">
            {t("setPassword.missingToken")}
          </p>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/login">{t("forgot.backToLogin")}</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
            <FormTextField
              control={form.control}
              name="password"
              type="password"
              label={t("setPassword.new")}
              autoComplete="new-password"
              description={t("setPassword.hint", { min: PASSWORD_MIN_LENGTH })}
            />
            <FormTextField
              control={form.control}
              name="confirm"
              type="password"
              label={t("setPassword.confirm")}
              autoComplete="new-password"
            />
            <SubmitButton pending={setPassword.isPending} size="lg" className="w-full">
              {t("setPassword.submit")}
            </SubmitButton>
          </form>
        </Form>
      )}
    </AuthShell>
  );
}
