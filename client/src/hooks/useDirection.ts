import { useTranslation } from "react-i18next";
import { isRtl } from "@/lib/i18n";

export function useDirection() {
  const { i18n } = useTranslation();
  return isRtl(i18n.language) ? ("rtl" as const) : ("ltr" as const);
}
