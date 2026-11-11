import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  /** Defaults to the localized "Cancel". */
  cancelLabel?: ReactNode;
  variant?: "default" | "destructive";
  /** Disables both buttons and shows a spinner on confirm. */
  pending?: boolean;
  /** Icon shown on the confirm button while idle. */
  icon?: LucideIcon;
  /**
   * Called on confirm. The dialog stays open — the caller closes it (via
   * `onOpenChange(false)` / its own state) once the action settles.
   */
  onConfirm: () => void;
}

/** Yes/no confirmation for consequential actions (delete, deactivate, logout). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  pending = false,
  icon: Icon,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel ?? t("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {pending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              Icon && <Icon aria-hidden />
            )}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
