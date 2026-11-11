import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface IconInputProps extends ComponentProps<typeof Input> {
  /** Decorative icon at the inline-start edge. */
  icon?: LucideIcon;
  /** Interactive or decorative content at the inline-end edge (e.g. a toggle button). */
  endAdornment?: ReactNode;
  /** Class for the positioning wrapper (width/layout); `className` styles the input. */
  containerClassName?: string;
}

/**
 * `Input` with optional start icon and end adornment. Base for every
 * decorated text field (search, password, …) so they share one look.
 */
export function IconInput({
  icon: Icon,
  endAdornment,
  containerClassName,
  className,
  ...props
}: IconInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      {Icon && (
        <Icon
          aria-hidden
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      )}
      <Input className={cn(Icon && "ps-9", endAdornment && "pe-10", className)} {...props} />
      {endAdornment && (
        <div className="absolute end-3 top-1/2 flex -translate-y-1/2 items-center">
          {endAdornment}
        </div>
      )}
    </div>
  );
}
