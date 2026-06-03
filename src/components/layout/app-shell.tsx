"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  userName: string;
  role: Role;
  children: React.ReactNode;
}

export function AppShell({ userName, role, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        userName={userName}
        role={role}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white md:block">
          <Sidebar role={role} />
        </aside>

        {/* Mobile overlay sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-label="關閉選單"
              role="button"
            />
            <aside className="relative h-full w-56 bg-white shadow-lg">
              <Sidebar role={role} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        <main className={cn("flex-1 p-4 pb-24 sm:p-6 md:pb-6")}>{children}</main>
      </div>

      <MobileNav onOpenMenu={() => setSidebarOpen(true)} />
    </div>
  );
}
