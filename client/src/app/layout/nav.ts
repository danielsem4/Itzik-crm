import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/features/auth";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Permission required to SEE the item (UX only — server authorizes actions). */
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/employees", labelKey: "nav.employees", icon: Users, permission: "EMPLOYEE_CREATE" },
  { to: "/admins", labelKey: "nav.admins", icon: ShieldCheck, permission: "ADMIN_CREATE" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

/** True when `pathname` is the item's route or one of its sub-routes. */
export function isNavItemActive(item: Pick<NavItem, "to">, pathname: string): boolean {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
