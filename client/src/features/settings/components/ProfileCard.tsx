import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList, DetailRow } from "@/components/shared";
import { useAuth } from "@/features/auth";

export function ProfileCard() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList>
          <DetailRow label={t("profile.name")}>{user?.name}</DetailRow>
          <DetailRow label={t("profile.email")}>{user?.email}</DetailRow>
          <DetailRow label={t("profile.role")}>
            {user && t(`common:roles.${user.role}`)}
          </DetailRow>
        </DetailList>
      </CardContent>
    </Card>
  );
}
