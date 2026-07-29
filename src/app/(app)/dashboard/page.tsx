import { Suspense } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NAV_ITEMS,
  type NavCategory,
} from "@/components/layout/nav-items";
import { CLINIC_NAME } from "@/lib/clinic";
import { formatTWD } from "@/lib/currency";
import { formatDateTW, taipeiDayStart } from "@/lib/date";
import { getDashboardStats } from "@/server/queries/dashboard";
import { countOutreachLists } from "@/server/queries/outreach";
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
  | { kind: "currency"; value: number; unit: string }
  | { kind: "text"; text: string }
  | { kind: "placeholder" }
  /** Rendered inside its own Suspense boundary — see `OutreachStat`. */
  | { kind: "deferred" };

/**
 * The outreach counts are the one dashboard number that cannot be folded
 * into the single stats query: they are three full-table aggregations
 * behind a 5-minute `unstable_cache`. On a cache miss they can take
 * ~500ms+, which used to hold the *entire* dashboard hostage because it
 * was just another entry in the page-level `Promise.all`.
 *
 * Streaming it in its own boundary means the other eight cards paint as
 * soon as the single stats query returns; this one fills in a beat later.
 */
async function OutreachStat({ accent }: { accent: string }) {
  const counts = await countOutreachLists();
  const total = counts.dormant + counts.packageFinished + counts.noShow;

  if (total === 0) {
    return (
      <div className={`text-lg font-light leading-tight ${accent}`}>
        目前沒有待聯絡名單
      </div>
    );
  }
  return (
    <div>
      <div className={`text-4xl font-light leading-none ${accent}`}>{total}</div>
      <div className="mt-2 text-xs text-neutral-500">位病人待聯絡</div>
    </div>
  );
}

function OutreachStatSkeleton() {
  return (
    <div>
      <div className="h-9 w-16 animate-pulse rounded bg-neutral-200" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const role = session.user.role;

  const items = NAV_ITEMS.filter(
    (i) => i.href !== "/dashboard" && (!i.roles || i.roles.includes(role)),
  );

  // Taipei month window for "this month" stats.
  const nowTaipei = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [taipeiYear, taipeiMonth] = nowTaipei.split("-").map(Number);
  const monthStart = taipeiDayStart(
    `${taipeiYear}-${String(taipeiMonth).padStart(2, "0")}-01`,
  );
  const nextMonthStart = taipeiDayStart(
    taipeiMonth === 12
      ? `${taipeiYear + 1}-01-01`
      : `${taipeiYear}-${String(taipeiMonth + 1).padStart(2, "0")}-01`,
  );
  // DOCTOR-scoped vs ADMIN-sees-all for the monthly revenue card.
  const isDoctor = role === "DOCTOR";

  // ONE round-trip for all nine scalars (see src/server/queries/dashboard.ts).
  // The outreach counts are deliberately NOT awaited here — they stream in
  // separately via <OutreachStat/> so their cache misses can't stall the page.
  const {
    patientCount,
    upcomingAppointmentCount,
    dueReminderCount,
    activeUserCount,
    activeProductCount,
    doctorsWithCommissionCount,
    monthRevenue,
    monthCommission,
    totalTreatmentRecords,
  } = await getDashboardStats({
    monthStart,
    nextMonthStart,
    doctorId: isDoctor ? session.user.id : undefined,
  });

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
      case "/analytics":
        // Streamed — the counts are three full aggregations behind a cache.
        return { kind: "deferred" };
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
      case "/reports/monthly":
        if (monthRevenue <= 0) {
          return { kind: "text", text: "本月尚無治療紀錄" };
        }
        return isDoctor
          ? { kind: "currency", value: monthCommission, unit: "本月抽成" }
          : { kind: "currency", value: monthRevenue, unit: "本月收入" };
      case "/research":
        return totalTreatmentRecords > 0
          ? {
              kind: "number",
              value: totalTreatmentRecords,
              unit: "筆治療紀錄可查詢",
            }
          : { kind: "text", text: "尚無治療紀錄" };
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
                        {stat.kind === "currency" && (
                          <div>
                            <div
                              className={`text-3xl font-light leading-none ${style.accent}`}
                            >
                              {formatTWD(stat.value)}
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">
                              {stat.unit}
                            </div>
                          </div>
                        )}
                        {stat.kind === "text" && (
                          <div>
                            <div
                              className={`text-lg font-light leading-tight ${style.accent}`}
                            >
                              {stat.text}
                            </div>
                          </div>
                        )}
                        {stat.kind === "deferred" && (
                          <Suspense fallback={<OutreachStatSkeleton />}>
                            <OutreachStat accent={style.accent} />
                          </Suspense>
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
