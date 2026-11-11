import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/features/auth";

/** Authenticated landing page. Grows into the business overview as modules land. */
export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("welcome", { name: user?.firstName ?? user?.name ?? "" })}
        description={t("description")}
      />
    </div>
  );
}
