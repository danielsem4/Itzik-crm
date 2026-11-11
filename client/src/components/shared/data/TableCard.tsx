import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TableCardProps {
  title?: ReactNode;
  /** Controls next to the title (search, filters, …). */
  toolbar?: ReactNode;
  /** Rendered below the table (e.g. `Pagination`). */
  footer?: ReactNode;
  /** Usually a `<Table>`, or a loading/empty/error state. */
  children: ReactNode;
}

/** Standard card container for data tables: optional header + toolbar, body, footer. */
export function TableCard({ title, toolbar, footer, children }: TableCardProps) {
  const hasHeader = title !== undefined || toolbar !== undefined;
  return (
    <Card className="gap-0 overflow-hidden py-0">
      {hasHeader && (
        <CardHeader className="flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between [.border-b]:pb-4">
          {title !== undefined && (
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          )}
          {toolbar}
        </CardHeader>
      )}
      <CardContent className="p-0">{children}</CardContent>
      {footer}
    </Card>
  );
}
