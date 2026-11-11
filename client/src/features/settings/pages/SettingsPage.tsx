import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared";
import { ProfileCard } from "../components/ProfileCard";
import { AppearanceCard } from "../components/AppearanceCard";
import { LanguageCard } from "../components/LanguageCard";
import { ChangePasswordCard } from "../components/ChangePasswordCard";

export function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProfileCard />
        <AppearanceCard />
        <LanguageCard />
        <ChangePasswordCard />
      </div>
    </div>
  );
}
