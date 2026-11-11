import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList, DetailRow } from "@/components/shared";
import { UserStatusBadge } from "./UserStatusBadge";
import type { UserDetail } from "../types";

export function AccountSecurityCard({ user }: { user: UserDetail }) {
  const { t } = useTranslation("users");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("details.accountSecurity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList className="space-y-3">
          <DetailRow label={t("table.status")}>
            <UserStatusBadge status={user.status} />
          </DetailRow>
          <DetailRow label={t("details.invitedBy")}>
            {user.invitedBy?.name ?? t("details.invitedBySystem")}
          </DetailRow>
          <DetailRow label={t("details.joined")}>
            {new Date(user.createdAt).toLocaleDateString()}
          </DetailRow>
          <DetailRow label={t("details.lastActive")}>
            {user.lastActiveAt
              ? new Date(user.lastActiveAt).toLocaleString()
              : t("details.neverActive")}
          </DetailRow>
        </DetailList>
      </CardContent>
    </Card>
  );
}
