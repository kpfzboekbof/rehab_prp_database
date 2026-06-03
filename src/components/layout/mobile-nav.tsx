"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Fixed bottom tab bar shown only on mobile (md:hidden). Surfaces the four
 * daily clinical destinations one thumb-tap away — the rest of the nav stays
 * behind the hamburger / "選單" button. Visible to every role.
 */
const ITEMS: MobileNavItem[] = [
  {
    href: "/dashboard",
    label: "首頁",
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9" />
    ),
  },
  {
    href: "/patients",
    label: "病人",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
  },
  {
    href: "/calendar",
    label: "日曆",
    icon: (
      <>
        <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
        <path d="M3.5 9h17M8 3v3M16 3v3" />
      </>
    ),
  },
  {
    href: "/reminders",
    label: "提醒",
    icon: (
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
    ),
  },
];

interface MobileNavProps {
  onOpenMenu: () => void;
}

export function MobileNav({ onOpenMenu }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium",
              active ? "text-[#1D697C]" : "text-neutral-500",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-neutral-500"
        aria-label="開啟更多選單"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        更多
      </button>
    </nav>
  );
}
