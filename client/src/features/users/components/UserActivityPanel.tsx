import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ErrorState,
  LoadingState,
  Pagination,
  TableCard,
  TableEmptyRow,
} from "@/components/shared";
import { ACTIVITY_PAGE_SIZE, useUserActivityQuery } from "../hooks/useUserQueries";

const COLUMN_COUNT = 4;

/** A user's recent audited actions. Only rendered for AUDIT_LOG_READ holders. */
export function UserActivityPanel({ userId }: { userId: string }) {
  const { t } = useTranslation("users");
  const [page, setPage] = useState(1);
  const query = useUserActivityQuery(userId, page);
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const entries = query.data?.entries ?? [];

  return (
    <TableCard
      title={t("activity.title")}
      footer={
        !query.isError && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            isFetching={query.isFetching}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )
      }
    >
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("activity.when")}</TableHead>
              <TableHead>{t("activity.action")}</TableHead>
              <TableHead>{t("activity.target")}</TableHead>
              <TableHead className="text-end">{t("activity.result")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableEmptyRow colSpan={COLUMN_COUNT}>{t("activity.noData")}</TableEmptyRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {t(`activity.actions.${e.action}`, { defaultValue: e.action })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.targetType ?? "—"}</TableCell>
                  <TableCell className="text-end">
                    <Badge variant={e.result === "SUCCESS" ? "success" : "destructive"}>
                      {t(`activity.results.${e.result}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </TableCard>
  );
}
