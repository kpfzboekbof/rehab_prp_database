import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { navItemsForRole } from "@/components/layout/nav-items";
import { db } from "@/lib/db";
import { requireSession } from "@/server/rbac";

/**
 * NOTE: when shipping a new feature page, replace its "功能開發中" entry
 * here with a real one-line stat (see the switch below) — see AGENTS.md.
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const items = navItemsForRole(session.user.role).filter(
    (i) => i.href !== "/dashboard",
  );

  const [
    patientCount,
    upcomingAppointmentCount,
    activeUserCount,
    activeProductCount,
    doctorsWithCommissionCount,
  ] = await Promise.all([
    db.patient.count({ where: { deletedAt: null } }),
    db.followUpAppointment.count({
      where: {
        scheduledAt: { gte: new Date() },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    db.user.count({ where: { active: true } }),
    db.pRPProduct.count({ where: { active: true } }),
    db.doctorCommissionRate.count({ where: { effectiveTo: null } }),
  ]);

  function statForHref(href: string): string | null {
    switch (href) {
      case "/patients":
        return `目前共 ${patientCount} 位病人`;
      case "/calendar":
        return upcomingAppointmentCount > 0
          ? `未來預約 ${upcomingAppointmentCount} 筆`
          : "尚無未來預約";
      case "/admin/users":
        return `共 ${activeUserCount} 位啟用使用者`;
      case "/admin/products":
        return `共 ${activeProductCount} 個啟用中品項`;
      case "/admin/commission":
        return `${doctorsWithCommissionCount} 位醫師有現行抽成規則`;
      default:
        return null; // not yet implemented
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          歡迎，{session.user.name || session.user.email}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          龜山康澤PRP管理系統 — 選擇下方功能開始使用。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const stat = statForHref(item.href);
          const isPlaceholder = stat === null;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-colors group-hover:border-neutral-400">
                <CardHeader>
                  <CardTitle className="text-lg">{item.label}</CardTitle>
                  <CardDescription>前往 {item.href}</CardDescription>
                </CardHeader>
                <CardContent
                  className={
                    isPlaceholder
                      ? "text-xs text-neutral-400"
                      : "text-xs text-neutral-600"
                  }
                >
                  {stat ?? "功能開發中"}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
