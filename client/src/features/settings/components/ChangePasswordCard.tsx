import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FormTextField, SubmitButton } from "@/components/shared";
import { toastApiError } from "@/lib/notify";
import {
  createChangePasswordSchema,
  useChangePasswordMutation,
  type ChangePasswordValues,
} from "@/features/auth";

const EMPTY: ChangePasswordValues = { current: "", next: "", confirm: "" };

export function ChangePasswordCard() {
  const { t } = useTranslation("settings");
  const change = useChangePasswordMutation();
  const schema = useMemo(() => createChangePasswordSchema(t), [t]);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  function onSubmit({ current, next }: ChangePasswordValues) {
    change.mutate(
      { current, next },
      {
        onSuccess: () => {
          toast.success(t("password.success"));
          form.reset(EMPTY);
        },
        onError: toastApiError,
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("password.title")}</CardTitle>
        <CardDescription>{t("password.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormTextField
              control={form.control}
              name="current"
              type="password"
              label={t("password.current")}
              autoComplete="current-password"
            />
            <FormTextField
              control={form.control}
              name="next"
              type="password"
              label={t("password.new")}
              autoComplete="new-password"
            />
            <FormTextField
              control={form.control}
              name="confirm"
              type="password"
              label={t("password.confirm")}
              autoComplete="new-password"
            />
            <SubmitButton pending={change.isPending}>{t("password.submit")}</SubmitButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
