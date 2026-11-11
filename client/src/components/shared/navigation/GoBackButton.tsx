import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDirection } from "@/hooks/useDirection";

interface GoBackButtonProps {
  /** Where to go when there is no in-app history to pop. Defaults to the app root. */
  fallback?: string;
  /** Override the default localized label. */
  label?: string;
  className?: string;
}

/**
 * Reusable "go back" control: pops the router history (`navigate(-1)`), falling
 * back to a fixed destination when the user landed here directly (e.g. a fresh
 * tab or a reload with no prior entry). The arrow flips for RTL locales.
 */
export function GoBackButton({
  fallback = "/",
  label,
  className,
}: GoBackButtonProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const dir = useDirection();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  function goBack() {
    // A "default" key means this is the first entry in the app's history stack,
    // so there is nothing to pop — send the user to the fallback instead.
    if (location.key !== "default") navigate(-1);
    else navigate(fallback);
  }

  return (
    <Button variant="outline" onClick={goBack} className={className}>
      <BackIcon aria-hidden />
      {label ?? t("actions.goBack")}
    </Button>
  );
}
