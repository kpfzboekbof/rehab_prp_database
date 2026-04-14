import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyTrendChart } from "@/components/reports/monthly-trend-chart";
import { formatTWD } from "@/lib/currency";
import { taipeiDateKey } from "@/lib/date";
import { getMonthlyTrend } from "@/server/queries/insights";
import { getMonthlyReport } from "@/server/queries/reports";
import { requireRole } from "@/server/rbac";

interface MonthlyReportPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

const MONTH_NAMES = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

export default async function MonthlyReportPage({
  searchParams,
}: MonthlyReportPageProps) {
  const session = await requireRole(["DOCTOR", "ADMIN"]);
  const params = await searchParams;

  // Default to current Taipei month.
  const todayKey = taipeiDateKey(new Date());
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);

  const year = Number.parseInt(params.year ?? "", 10) || todayYear;
  const rawMonth = Number.parseInt(params.month ?? "", 10) || todayMonth;
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : todayMonth;

  const isDoctor = session.user.role === "DOCTOR";
  const [report, trend] = await Promise.all([
    getMonthlyReport({
      year,
      month,
      doctorId: isDoctor ? session.user.id : undefined,
    }),
    getMonthlyTrend({
      monthsBack: 12,
      doctorId: isDoctor ? session.user.id : undefined,
    }),
  ]);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const csvUrl = `/api/reports/monthly?year=${year}&month=${month}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">月業績報表</h1>
          <p className="mt-1 text-sm text-neutral-600">
            以治療紀錄建立當下 snapshot 的金額 / 抽成為準。調整品項價格或抽成規則不影響歷史月份。
            {isDoctor && " 目前僅顯示你自己的資料。"}
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={csvUrl} download>
            匯出 CSV
          </a>
        </Button>
      </div>

      {/* Month picker */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 bg-white p-3">
        <Button asChild variant="outline" size="sm">
          <Link
            href={{ pathname: "/reports/monthly", query: { year: prevYear, month: prevMonth } }}
          >
            ← 上月
          </Link>
        </Button>
        <div className="flex-1 text-center text-lg font-semibold">
          {year} 年 {MONTH_NAMES[month - 1]}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link
            href={{ pathname: "/reports/monthly", query: { year: nextYear, month: nextMonth } }}
          >
            下月 →
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/reports/monthly">本月</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="治療筆數"
          value={String(report.totals.treatmentCount)}
          hint={`收費 ${report.totals.chargingCount} 筆`}
        />
        <SummaryCard
          label="不同病人"
          value={String(report.totals.distinctPatientCount)}
          hint="位"
        />
        <SummaryCard
          label="總收入"
          value={formatTWD(report.totals.grossRevenue)}
          hint="已 snapshot"
          accent
        />
        <SummaryCard
          label={isDoctor ? "你的抽成" : "總抽成"}
          value={formatTWD(report.totals.totalCommission)}
          hint={
            report.totals.grossRevenue > 0
              ? `平均 ${(
                  (report.totals.totalCommission / report.totals.grossRevenue) *
                  100
                ).toFixed(1)}%`
              : "—"
          }
          accent
        />
      </div>

      {/* 12-month trend */}
      <Card>
        <CardHeader>
          <CardTitle>近 12 個月趨勢</CardTitle>
          <CardDescription>
            收入（柱）+ 不同病人數與新病人數（線）。滑鼠移到圖表上可以看單月數字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart
            data={trend.map((p) => ({
              month: p.month,
              grossRevenue: p.grossRevenue,
              treatmentCount: p.treatmentCount,
              distinctPatientCount: p.distinctPatientCount,
              newPatientCount: p.newPatientCount,
            }))}
          />
        </CardContent>
      </Card>

      {/* Per-doctor */}
      {!isDoctor && (
        <Card>
          <CardHeader>
            <CardTitle>醫師別</CardTitle>
            <CardDescription>
              依醫師匯總本月業績與抽成（收入倒序）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.perDoctor.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-500">
                本月沒有治療紀錄
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">醫師</th>
                      <th className="px-4 py-3 text-right font-medium">治療筆數</th>
                      <th className="px-4 py-3 text-right font-medium">收費筆數</th>
                      <th className="px-4 py-3 text-right font-medium">總收入</th>
                      <th className="px-4 py-3 text-right font-medium">平均抽成</th>
                      <th className="px-4 py-3 text-right font-medium">抽成金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {report.perDoctor.map((d) => (
                      <tr key={d.doctorId} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">
                            {d.doctorName}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {d.doctorEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-700">
                          {d.treatmentCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-700">
                          {d.chargingCount}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatTWD(d.grossRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-700">
                          {(d.averageCommissionRate * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#6A5BA3]">
                          {formatTWD(d.totalCommission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-product */}
      <Card>
        <CardHeader>
          <CardTitle>PRP 品項別</CardTitle>
          <CardDescription>
            依品項匯總本月使用量與收入（收入倒序）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.perProduct.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">
              本月沒有治療紀錄
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">品項</th>
                    <th className="px-4 py-3 text-right font-medium">治療筆數</th>
                    <th className="px-4 py-3 text-right font-medium">購入瓶數</th>
                    <th className="px-4 py-3 text-right font-medium">使用瓶數</th>
                    <th className="px-4 py-3 text-right font-medium">收入</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {report.perProduct.map((p) => (
                    <tr key={p.productId} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">
                          {p.productName}
                        </div>
                        {p.packageSize != null && (
                          <div className="text-xs text-neutral-500">
                            預付套組 · {p.packageSize} 瓶
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {p.treatmentCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {p.vialsPurchased}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {p.vialsUsed}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatTWD(p.grossRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>為什麼數字不變動？</strong>
        每筆治療紀錄在建立時會 snapshot 當下的單價與醫師抽成比例，之後調整品項價格或抽成規則都不會影響歷史月份。這裡看到的金額永遠等於當月實際收費。
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={
          "mt-1 text-3xl font-light " +
          (accent ? "text-[#6A5BA3]" : "text-neutral-900")
        }
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}
