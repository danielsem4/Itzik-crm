import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Mail, UserCheck, UserX, Users } from "lucide-react";
import {
  ConfirmDialog,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
} from "@/components/shared";
import { toastApiError } from "@/lib/notify";
import type { User } from "@/features/auth";
import { MANAGED_ROLES } from "../lib/roles";
import { useDeactivateUserMutation } from "../hooks/useUserQueries";
import { useUsersList } from "../hooks/useUsersList";
import { UsersTable } from "../components/UsersTable";
import { InviteUserDialog } from "../components/InviteUserDialog";
import type { ManagedRole } from "../types";

export function UserManagementPage({ role }: { role: ManagedRole }) {
  const { t } = useTranslation("users");
  const navigate = useNavigate();
  const { path, i18nKey } = MANAGED_ROLES[role];
  const list = useUsersList(role);
  const deactivate = useDeactivateUserMutation(role);
  const [toDeactivate, setToDeactivate] = useState<User | null>(null);
  const perPageHint = list.totalPages > 1 ? t("stats.thisPage") : undefined;

  function confirmDeactivate() {
    if (!toDeactivate) return;
    deactivate.mutate(toDeactivate.id, {
      onSuccess: () => {
        toast.success(t("deactivate.success", { name: toDeactivate.name }));
        setToDeactivate(null);
      },
      onError: toastApiError,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`${i18nKey}.title`)}
        description={t(`${i18nKey}.description`)}
        actions={<InviteUserDialog role={role} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label={t("stats.total")} value={list.total} />
        <StatCard
          icon={UserCheck}
          label={t("stats.active")}
          value={list.activeCount}
          hint={perPageHint}
        />
        <StatCard
          icon={Mail}
          label={t("stats.invited")}
          value={list.invitedCount}
          hint={perPageHint}
        />
      </div>

      <TableCard
        title={`${t(`${i18nKey}.title`)} (${list.total})`}
        toolbar={
          <SearchInput
            containerClassName="w-full sm:max-w-xs"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={list.search}
            onValueChange={list.setSearch}
          />
        }
        footer={
          !list.isError && (
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              isFetching={list.isFetching}
              onPrev={list.goPrev}
              onNext={list.goNext}
            />
          )
        }
      >
        {list.isLoading ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : (
          <UsersTable
            users={list.users}
            onView={(user) => navigate(`${path}/${user.id}`)}
            onDeactivate={setToDeactivate}
          />
        )}
      </TableCard>

      <ConfirmDialog
        open={!!toDeactivate}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title={t("deactivate.title")}
        description={t("deactivate.description", { name: toDeactivate?.name ?? "" })}
        cancelLabel={t("deactivate.cancel")}
        confirmLabel={t("deactivate.confirm")}
        variant="destructive"
        icon={UserX}
        pending={deactivate.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
