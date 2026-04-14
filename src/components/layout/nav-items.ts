import type { Role } from "@prisma/client";

/**
 * Functional grouping of nav items, used by the dashboard to render
 * sections. The sidebar ignores this and shows a flat list.
 *
 *   clinical — daily patient-facing work (patients / calendar / reminders)
 *   business — financial reports + business analytics hub + research DB.
 *              The /analytics hub collapses all the outreach action
 *              lists (dormant, package-finished, no-show) and the
 *              analytics reports (retention, sessions, funnel) behind
 *              one sidebar entry so the nav stays short.
 *   admin    — system configuration (users / products / commission)
 */
export type NavCategory = "clinical" | "business" | "admin";

export interface NavItem {
  href: string;
  label: string;
  category: NavCategory;
  // Which roles can see this nav item. If undefined, visible to everyone logged in.
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "首頁", category: "clinical" },
  { href: "/patients", label: "病人管理", category: "clinical" },
  { href: "/calendar", label: "回診日曆", category: "clinical" },
  { href: "/reminders", label: "回診提醒", category: "clinical" },

  { href: "/analytics", label: "業務分析", category: "business" },
  { href: "/reports/monthly", label: "月業績報表", category: "business", roles: ["DOCTOR", "ADMIN"] },
  { href: "/research", label: "研究資料庫", category: "business", roles: ["DOCTOR", "ADMIN"] },

  { href: "/admin/users", label: "使用者管理", category: "admin", roles: ["ADMIN"] },
  { href: "/admin/products", label: "PRP 品項", category: "admin", roles: ["ADMIN"] },
  { href: "/admin/commission", label: "抽成設定", category: "admin", roles: ["ADMIN"] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
