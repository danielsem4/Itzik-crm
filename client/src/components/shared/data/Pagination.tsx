import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDirection } from "@/hooks/useDirection";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Disables navigation while a page is loading. */
  isFetching?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** Prev/next pager with total + "page x of y". */
export function Pagination({
  page,
  totalPages,
  total,
  isFetching = false,
  onPrev,
  onNext,
}: PaginationProps) {
  const { t } = useTranslation("common");
  const dir = useDirection();
  // Flip the chevrons for RTL so "previous" always points to the start.
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <nav
      aria-label={t("pagination.label")}
      className="flex flex-wrap items-center justify-between gap-4 border-t p-4 text-sm text-muted-foreground"
    >
      <span>{t("pagination.total", { count: total })}</span>
      <div className="flex items-center gap-3">
        <span>{t("pagination.pageInfo", { page, totalPages: Math.max(totalPages, 1) })}</span>
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1 || isFetching}>
          <PrevIcon aria-hidden />
          {t("pagination.prev")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages || isFetching}
        >
          {t("pagination.next")}
          <NextIcon aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
