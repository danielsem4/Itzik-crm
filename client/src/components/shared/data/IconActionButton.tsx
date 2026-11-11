import type { ComponentProps } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IconActionButtonProps
  extends Omit<ComponentProps<typeof Button>, "children" | "variant" | "size" | "aria-label"> {
  icon: LucideIcon;
  /** Accessible name + tooltip text. Required: icon-only buttons need one. */
  label: string;
  tone?: "default" | "destructive";
  /** Shows a spinner instead of the icon (and disables the button). */
  loading?: boolean;
}

/** Icon-only action (table rows, toolbars) with tooltip + accessible label. */
export function IconActionButton({
  icon: Icon,
  label,
  tone = "default",
  loading = false,
  disabled,
  className,
  ...props
}: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled || loading}
          className={cn(
            tone === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
            className
          )}
          {...props}
        >
          {loading ? <Loader2 aria-hidden className="animate-spin" /> : <Icon aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
