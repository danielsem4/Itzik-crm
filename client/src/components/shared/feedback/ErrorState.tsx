import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** Defaults to the localized generic error message. */
  message?: ReactNode;
  /** When provided, renders a Retry button. */
  onRetry?: () => void;
  className?: string;
}

/** Shown when an async view failed to load. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation("common");
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8 text-center",
        className
      )}
    >
      <p className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle aria-hidden className="size-4 shrink-0" />
        {message ?? t("states.error")}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          {t("actions.retry")}
        </Button>
      )}
    </div>
  );
}
