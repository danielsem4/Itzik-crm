import type { ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

/** Full-width placeholder row for a table with no rows. */
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
