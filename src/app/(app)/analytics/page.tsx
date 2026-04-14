import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countOutreachLists } from "@/server/queries/outreach";
import { requireSession } from "@/server/rbac";

/**
 * Landing hub for all "業務分析" features: the daily outreach action
 * lists (who to call) and the higher-order analytics reports (how
 * the business is doing). The nav has a single entry for this page
 * so the sidebar stays short — you land here and pick what you need.
 *
 * STAFF see only the action lists. DOCTOR / ADMIN see both sections.
 */
export default async function AnalyticsHubPage() {
  const session = await requireSession();
  const role = session.user.role;
  const canSeeReports = role === "DOCTOR" || role === "ADMIN";

  const counts = await countOutreachLists();

  const actionLists = [
    {
      href: "/outreach/dormant",
      title: "沉睡病人",
      description:
        "久未回診、也沒有未來預約的老客戶。打一通電話問問症狀，往往最容易成交。",
      count: counts.dormant,
    },
    {
      href: "/outreach/package-finished",
      title: "套組用完未續購",
      description:
        "買過預付套組且剩餘 0 瓶的病人。療程結束是最自然的推銷點。",
      count: counts.packageFinished,
    },
    {
      href: "/outreach/no-show",
      title: "爽約 / 未補約",
      description:
        "上次預約沒來或取消、也沒有後續排程的病人。主動撈回來修復關係。",
      count: counts.noShow,
    },
  ];

  const reports = [
    {
      href: "/reports/insights/retention",
      title: "回購分析",
      description:
        "付費病人的回購率、平均終身價值、首次到第二次間隔中位數，附月份 cohort 表與 VIP 前 10 名。",
    },
    {
      href: "/reports/insights/sessions",
      title: "診次使用率",
      description:
        "早/午/晚診 × 星期的熱度圖。看哪個時段還有空，哪個時段已經滿到需要調整。",
    },
    {
      href: "/reports/insights/funnel",
      title: "新客轉化漏斗",
      description:
        "每月新病人數、回購轉化率、首次治療客單價。衡量衛教與回診提醒的成效。",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">業務分析</h1>
        <p className="mt-1 text-sm text-neutral-600">
          左邊是「今天要打的電話」，右邊是「知道生意做得好不好」。行動清單按資料自動產生，可以邊打電話邊勾選「已聯絡」；分析報表則給你宏觀看趨勢。
        </p>
      </div>

      {/* Action lists */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-neutral-900">行動清單</h2>
          <p className="mt-1 text-xs text-neutral-500">
            今天可以打給誰。勾選「已聯絡」後該病人會暫時從主名單消失，60 天後若還沒回來會再出現。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actionLists.map((l) => (
            <Link key={l.href} href={l.href} className="group block">
              <Card className="h-full border-l-4 border-l-[#ED6D3D] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-neutral-900">
                    {l.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {l.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-light leading-none text-[#ED6D3D]">
                    {l.count}
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">位</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Analytics reports — DOCTOR/ADMIN only */}
      {canSeeReports && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-neutral-900">分析報表</h2>
            <p className="mt-1 text-xs text-neutral-500">
              跨月份的宏觀趨勢。月業績報表的「近 12 個月趨勢」圖也值得順便看一下。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <Link key={r.href} href={r.href} className="group block">
                <Card className="h-full border-l-4 border-l-[#6A5BA3] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-neutral-900">
                      {r.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {r.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-[#6A5BA3]">進入 →</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>什麼算「已聯絡」？</strong>
        勾選後，該病人會從主名單移到下方「近期已聯絡」區塊、淡灰色顯示。60 天後若對方仍沒回來，會自動回到主名單。
      </div>
    </div>
  );
}
