"use client";

import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";

interface HeaderProps {
  userName: string;
  role: Role;
  onToggleSidebar: () => void;
}

const ROLE_LABELS: Record<Role, string> = {
  DOCTOR: "醫師",
  STAFF: "診所員工",
  ADMIN: "系統管理員",
};

export function Header({ userName, role, onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="開啟選單"
          className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
        <span className="text-base font-semibold">PRP 病人追蹤系統</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-neutral-600 sm:inline">
          {userName}（{ROLE_LABELS[role]}）
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          登出
        </Button>
      </div>
    </header>
  );
}
