import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  /** Inside a panel, tab, or dialog. */
  sm: { wrapper: "py-6", icon: "size-5" },
  /** In a page section (e.g. a table area). */
  md: { wrapper: "py-10", icon: "size-6" },
  /** Whole-screen gate (session hydration, lazy routes). */
  page: { wrapper: "min-h-screen", icon: "size-8" },
} as const;

interface LoadingStateProps {
  size?: keyof typeof SIZES;
  /** Accessible label; defaults to the localized "Loading…". */
  label?: string;
  className?: string;
}

/** The single loading indicator for async views. */
export function LoadingState({ size = "md", label, className }: LoadingStateProps) {
  const { t } = useTranslation("common");
  const { wrapper, icon } = SIZES[size];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center", wrapper, className)}
    >
      <Loader2 aria-hidden className={cn("animate-spin text-muted-foreground", icon)} />
      <span className="sr-only">{label ?? t("states.loading")}</span>
    </div>
  );
}
