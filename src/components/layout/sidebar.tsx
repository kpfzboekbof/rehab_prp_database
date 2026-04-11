"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { navItemsForRole } from "./nav-items";

interface SidebarProps {
  role: Role;
  onNavigate?: () => void;
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        功能列表
      </div>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
