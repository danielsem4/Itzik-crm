import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ErrorState, GoBackButton, LoadingState } from "@/components/shared";
import { toastApiError } from "@/lib/notify";
import { PERMISSIONS, hasPermission, useAuth } from "@/features/auth";
import { MANAGED_ROLES } from "../lib/roles";
import { useDeactivateUserMutation, useUserQuery } from "../hooks/useUserQueries";
import { UserProfileHeader } from "../components/UserProfileHeader";
import { AccountSecurityCard } from "../components/AccountSecurityCard";
import { UserActivityPanel } from "../components/UserActivityPanel";
import type { ManagedRole } from "../types";

/**
 * Managed-user detail: profile, account/security, deactivate, and (SUPER_ADMIN
 * only) the user's audited activity.
 */
export function UserDetailsPage({ role }: { role: ManagedRole }) {
  const { t } = useTranslation("users");
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const { data: user, isLoading, isError } = useUserQuery(role, id);
  const deactivate = useDeactivateUserMutation(role);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // UX only — the server enforces AUDIT_LOG_READ on the endpoint.
  const canReadActivity = !!me && hasPermission(me.role, PERMISSIONS.AUDIT_LOG_READ);

  function confirmDeactivate() {
    if (!user) return;
    deactivate.mutate(user.id, {
      onSuccess: () => {
        toast.success(t("deactivate.success", { name: user.name }));
        setConfirmOpen(false);
      },
      onError: toastApiError,
    });
  }

  return (
    <div className="space-y-6">
      <GoBackButton fallback={MANAGED_ROLES[role].path} />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message={t("details.notFound")} />}

      {user && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <UserProfileHeader
                user={user}
                actions={
                  <Button
                    variant="outline"
                    className="text-destructive"
                    disabled={user.status === "DISABLED" || user.id === me?.id}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <UserX aria-hidden />
                    {t("deactivate.title")}
                  </Button>
                }
              />
            </div>
            <AccountSecurityCard user={user} />
          </div>

          {canReadActivity && <UserActivityPanel userId={user.id} />}

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={t("deactivate.title")}
            description={t("deactivate.description", { name: user.name })}
            cancelLabel={t("deactivate.cancel")}
            confirmLabel={t("deactivate.confirm")}
            variant="destructive"
            icon={UserX}
            pending={deactivate.isPending}
            onConfirm={confirmDeactivate}
          />
        </>
      )}
    </div>
  );
}
