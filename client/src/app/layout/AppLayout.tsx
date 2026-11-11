import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NAV_ITEMS, isNavItemActive } from "./nav";

/** Authenticated app chrome: collapsible sidebar + top bar + routed content. */
export function AppLayout() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => isNavItemActive(item, pathname));

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ms-1 rtl:-scale-x-100" aria-label={t("sidebar.toggle")} />
          <Separator orientation="vertical" className="me-2 data-[orientation=vertical]:h-4" />
          <span className="text-sm font-medium">
            {current ? t(current.labelKey) : t("app.name")}
          </span>
        </header>
        <div className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
