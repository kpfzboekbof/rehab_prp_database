import Link from "next/link";
import type { Role } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NAV_ITEMS,
  type NavCategory,
} from "@/components/layout/nav-items";
import { CLINIC_NAME } from "@/lib/clinic";
import { db } from "@/lib/db";
import { formatDateTW } from "@/lib/date";
import { countDueRemindersToday } from "@/server/queries/reminders";
import { requireSession } from "@/server/rbac";

/**
 * NOTE for future agents: when shipping a new feature page, add a case
 * for its href to `statForHref` so the dashboard card stops showing the
 * "—  開發中" placeholder. See AGENTS.md for the rule.
 */

const ROLE_LABELS: Record<Role, string> = {
  DOCTOR: "醫師",
  STAFF: "護理師",
  ADMIN: "管理者 / 醫師",
};

/**
 * Color tokens picked from https://nipponcolors.com — calm, slightly
 * muted, and visually distinct between sections. Stored as full Tailwind
 * arbitrary-value strings because Tailwind v4 cannot interpolate these
 * dynamically.
 */
const CATEGORY_STYLES: Record<
  NavCategory,
  {
    label: string;
    accent: string; // text colour
    border: string; // left border on the cards
    line: string; // section divider line
  }
> = {
  clinical: {
    label: "臨床作業",
    accent: "text-[#1D697C]",
    border: "border-l-[#1D697C]",
    line: "bg-[#1D697C]/30",
  },
  business: {
    label: "業務管理",
    accent: "text-[#6A5BA3]",
    border: "border-l-[#6A5BA3]",
    line: "bg-[#6A5BA3]/30",
  },
  admin: {
    label: "系統設定",
    accent: "text-[#91AD70]",
    border: "border-l-[#91AD70]",
    line: "bg-[#91AD70]/30",
  },
};

const SECTION_ORDER: NavCategory[] = ["clinical", "business", "admin"];

type Stat =
  | { kind: "number"; value: number; unit: string }
  | { kind: "text"; text: string }
  | { kind: "placeholder" };

export default async function DashboardPage() {
  const session = await requireSession();
  const role = session.user.role;

  const items = NAV_ITEMS.filter(
    (i) => i.href !== "/dashboard" && (!i.roles || i.roles.includes(role)),
  );

  const [
    patientCount,
    upcomingAppointmentCount,
    dueReminderCount,
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
    countDueRemindersToday(),
    db.user.count({ where: { active: true } }),
    db.pRPProduct.count({ where: { active: true } }),
    db.doctorCommissionRate.count({ where: { effectiveTo: null } }),
  ]);

  function statForHref(href: string): Stat {
    switch (href) {
      case "/patients":
        return { kind: "number", value: patientCount, unit: "位病人" };
      case "/calendar":
        return upcomingAppointmentCount > 0
          ? { kind: "number", value: upcomingAppointmentCount, unit: "筆未來預約" }
          : { kind: "text", text: "尚無未來預約" };
      case "/reminders":
        return dueReminderCount > 0
          ? { kind: "number", value: dueReminderCount, unit: "位今日待電訪" }
          : { kind: "text", text: "今日無須電訪" };
      case "/admin/users":
        return { kind: "number", value: activeUserCount, unit: "位啟用使用者" };
      case "/admin/products":
        return { kind: "number", value: activeProductCount, unit: "個啟用品項" };
      case "/admin/commission":
        return {
          kind: "number",
          value: doctorsWithCommissionCount,
          unit: "位醫師有抽成規則",
        };
      default:
        return { kind: "placeholder" };
    }
  }

  const today = new Date();
  const dateStr = formatDateTW(today);
  const weekday = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    weekday: "long",
  }).format(today);

  const userName = session.user.name || session.user.email || "";

  return (
    <div className="mx-auto max-w-5xl space-y-16">
      {/* Greeting block */}
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.25em] text-neutral-400">
          {dateStr} · {weekday}
        </div>
        <h1 className="text-3xl font-light tracking-wide text-neutral-900 sm:text-4xl">
          歡迎回來，<span className="font-medium">{userName}</span>
        </h1>
        <p className="text-sm text-neutral-500">
          {CLINIC_NAME} · {ROLE_LABELS[role]}
        </p>
      </header>

      {/* Categorised sections */}
      {SECTION_ORDER.map((category) => {
        const categoryItems = items.filter((i) => i.category === category);
        if (categoryItems.length === 0) return null;
        const style = CATEGORY_STYLES[category];

        return (
          <section key={category} className="space-y-6">
            <div>
              <h2
                className={`text-4xl font-light tracking-wide sm:text-5xl ${style.accent}`}
              >
                {style.label}
              </h2>
              <div className={`mt-3 h-0.5 w-24 ${style.line}`} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryItems.map((item) => {
                const stat = statForHref(item.href);
                const isPlaceholder = stat.kind === "placeholder";
                return (
                  <Link key={item.href} href={item.href} className="group block">
                    <Card
                      className={`h-full border-l-4 ${style.border} transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-neutral-900">
                          {item.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stat.kind === "number" && (
                          <div>
                            <div
                              className={`text-4xl font-light leading-none ${style.accent}`}
                            >
                              {stat.value}
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">
                              {stat.unit}
                            </div>
                          </div>
                        )}
                        {stat.kind === "text" && (
                          <div>
                            <div className="text-2xl font-light leading-none text-neutral-400">
                              ◯
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">
                              {stat.text}
                            </div>
                          </div>
                        )}
                        {isPlaceholder && (
                          <div>
                            <div className="text-4xl font-light leading-none text-neutral-300">
                              —
                            </div>
                            <div className="mt-2 text-xs text-neutral-400">
                              功能開發中
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
