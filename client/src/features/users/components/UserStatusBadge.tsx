import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/features/auth";

const VARIANT: Record<UserStatus, "success" | "secondary" | "outline"> = {
  ACTIVE: "success",
  INVITED: "secondary",
  DISABLED: "outline",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useTranslation("users");
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}
