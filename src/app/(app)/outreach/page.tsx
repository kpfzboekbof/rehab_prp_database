import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countOutreachLists } from "@/server/queries/outreach";
import { requireRole } from "@/server/rbac";

export default async function OutreachLandingPage() {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const counts = await countOutreachLists();

  const lists = [
    {
      href: "/outreach/dormant",
      title: "沉睡病人",
      description: "久未回診、也沒有未來預約的老客戶。打一通電話問問症狀，往往最容易成交。",
      count: counts.dormant,
      unit: "位",
    },
    {
      href: "/outreach/package-finished",
      title: "套組用完未續購",
      description: "買過預付套組且剩餘 0 瓶的病人。療程結束是最自然的推銷點。",
      count: counts.packageFinished,
      unit: "位",
    },
    {
      href: "/outreach/no-show",
      title: "爽約 / 未補約",
      description: "上次預約沒來或取消、也沒有後續排程的病人。主動撈回來修復關係。",
      count: counts.noShow,
      unit: "位",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">行銷行動</h1>
        <p className="mt-1 text-sm text-neutral-600">
          依資料自動產生的病人聯絡清單，點進去後可以邊打電話邊勾選「已聯絡」。這裡不是報表，是你今天要打的電話列表。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <Link key={l.href} href={l.href} className="group block">
            <Card className="h-full border-l-4 border-l-[#ED6D3D] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-neutral-900">
                  {l.title}
                </CardTitle>
                <CardDescription className="text-xs">{l.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-light leading-none text-[#ED6D3D]">
                  {l.count}
                </div>
                <div className="mt-2 text-xs text-neutral-500">{l.unit}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>什麼算「已聯絡」？</strong>
        勾選後，該病人會從主名單移到下方的「近期已聯絡」區塊、淡灰色顯示。60 天後若對方仍沒回來，會自動回到主名單。
      </div>
    </div>
  );
}
