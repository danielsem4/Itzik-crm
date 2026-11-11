import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Read-only label/value list (profile, entity details). Use with `DetailRow`. */
export function DetailList({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("space-y-1 text-sm", className)}>{children}</dl>;
}

interface DetailRowProps {
  label: ReactNode;
  /** Text or any node (e.g. a badge). Empty values render an em dash. */
  children?: ReactNode;
}

export function DetailRow({ label, children }: DetailRowProps) {
  const isEmpty = children === null || children === undefined || children === "";
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{isEmpty ? "—" : children}</dd>
    </div>
  );
}
