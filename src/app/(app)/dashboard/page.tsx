import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { navItemsForRole } from "@/components/layout/nav-items";
import { requireSession } from "@/server/rbac";

export default async function DashboardPage() {
  const session = await requireSession();
  const items = navItemsForRole(session.user.role).filter((i) => i.href !== "/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">歡迎，{session.user.name || session.user.email}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          PRP 病人追蹤系統 — 選擇下方功能開始使用。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full transition-colors group-hover:border-neutral-400">
              <CardHeader>
                <CardTitle className="text-lg">{item.label}</CardTitle>
                <CardDescription>前往 {item.href}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-neutral-500">
                功能開發中
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
