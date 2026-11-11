import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormTextField, SubmitButton } from "@/components/shared";
import { toastApiError } from "@/lib/notify";
import { useInviteUserMutation } from "../hooks/useUserQueries";
import { createInviteUserSchema, type InviteUserValues } from "../schemas/invite.schema";
import type { ManagedRole } from "../types";

const EMPTY: InviteUserValues = { firstName: "", lastName: "", email: "", phone: "" };

export function InviteUserDialog({ role }: { role: ManagedRole }) {
  const { t } = useTranslation("users");
  const [open, setOpen] = useState(false);
  const invite = useInviteUserMutation(role);
  const schema = useMemo(() => createInviteUserSchema(t), [t]);
  const form = useForm<InviteUserValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const title = t(`invite.add.${role}`);

  function onSubmit(values: InviteUserValues) {
    invite.mutate(values, {
      onSuccess: () => {
        toast.success(t("invite.success", { email: values.email }));
        form.reset(EMPTY);
        setOpen(false);
      },
      onError: toastApiError,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden />
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("invite.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormTextField
                control={form.control}
                name="firstName"
                label={t("invite.firstName")}
                autoComplete="given-name"
              />
              <FormTextField
                control={form.control}
                name="lastName"
                label={t("invite.lastName")}
                autoComplete="family-name"
              />
            </div>
            <FormTextField
              control={form.control}
              name="email"
              type="email"
              label={t("invite.email")}
              autoComplete="email"
            />
            <FormTextField
              control={form.control}
              name="phone"
              type="tel"
              label={t("invite.phone")}
              autoComplete="tel"
            />
            <DialogFooter>
              <SubmitButton pending={invite.isPending} icon={UserPlus}>
                {title}
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
