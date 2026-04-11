import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  // Which roles can see this nav item. If undefined, visible to everyone logged in.
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "首頁" },
  { href: "/patients", label: "病人管理" },
  { href: "/calendar", label: "回診日曆" },
  { href: "/reminders", label: "回診提醒" },
  { href: "/reports/monthly", label: "月業績報表", roles: ["DOCTOR", "ADMIN"] },
  { href: "/research", label: "研究資料庫", roles: ["DOCTOR", "ADMIN"] },
  { href: "/admin/users", label: "使用者管理", roles: ["ADMIN"] },
  { href: "/admin/products", label: "PRP 品項", roles: ["ADMIN"] },
  { href: "/admin/commission", label: "抽成設定", roles: ["ADMIN"] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
