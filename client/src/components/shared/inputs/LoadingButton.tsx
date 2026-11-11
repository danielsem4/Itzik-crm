import type { ComponentProps } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LoadingButtonProps extends ComponentProps<typeof Button> {
  pending: boolean;
  /** Icon shown while idle; replaced by a spinner while pending. */
  icon?: LucideIcon;
}

/** Button for async actions: disabled + spinner while `pending`. */
export function LoadingButton({
  pending,
  icon: Icon,
  disabled,
  type = "button",
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button type={type} disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : Icon && <Icon aria-hidden />}
      {children}
    </Button>
  );
}
