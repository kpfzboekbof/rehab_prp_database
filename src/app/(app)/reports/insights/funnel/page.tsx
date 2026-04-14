import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTWD } from "@/lib/currency";
import { getNewPatientFunnel } from "@/server/queries/insights";
import { requireRole } from "@/server/rbac";

interface FunnelInsightsPageProps {
  searchParams: Promise<{ months?: string }>;
}

const MONTH_OPTIONS = [6, 12, 24];

export default async function FunnelInsightsPage({
  searchParams,
}: FunnelInsightsPageProps) {
  await requireRole(["DOCTOR", "ADMIN"]);
  const params = await searchParams;

  const raw = Number.parseInt(params.months ?? "", 10);
  const monthsBack =
    Number.isFinite(raw) && raw >= 1 && raw <= 36 ? raw : 12;

  const stats = await getNewPatientFunnel({ monthsBack });

  const totalNew = stats.points.reduce((s, p) => s + p.newPatientCount, 0);
  const totalConverted = stats.points.reduce(
    (s, p) => s + p.convertedToSecond,
    0,
  );
  const totalFirstRevenue = stats.points.reduce(
    (s, p) => s + p.firstVisitRevenue,
    0,
  );
  const avgFirstRevenue =
    totalNew > 0 ? Math.round(totalFirstRevenue / totalNew) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/analytics" className="underline-offset-4 hover:underline">
          業務分析
        </Link>
        <span className="mx-2">/</span>
        <span>新客戶轉化漏斗</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">新客戶轉化漏斗</h1>
        <p className="mt-1 text-sm text-neutral-600">
          新病人（第一次收費治療）多少會回來打第二次？轉化率低可能代表：治療體驗不佳、沒做回診提醒，或是價格不敏感導致沒預留給二次治療的預算。
        </p>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-3 text-sm">
        <span className="text-neutral-600">統計區間：近</span>
        {MONTH_OPTIONS.map((m) => (
          <Link
            key={m}
            href={{ pathname: "/reports/insights/funnel", query: { months: m } }}
            className={
              "rounded-md px-3 py-1 " +
              (m === monthsBack
                ? "bg-[#6A5BA3] text-white"
                : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50")
            }
          >
            {m} 個月
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="新病人總數"
          value={String(totalNew)}
          hint="第一次收費治療落在區間內"
        />
        <SummaryCard
          label="已回購"
          value={String(totalConverted)}
          hint={
            totalNew > 0
              ? `整體轉化率 ${(stats.overallConversionRate * 100).toFixed(1)}%`
              : "—"
          }
          accent
        />
        <SummaryCard
          label="首次治療平均收入"
          value={formatTWD(avgFirstRevenue)}
          hint="每位新病人"
        />
        <SummaryCard
          label="首次 → 第二次間隔"
          value={
            stats.medianDaysToSecond == null
              ? "—"
              : `${stats.medianDaysToSecond} 天`
          }
          hint="中位數"
          accent
        />
      </div>

      {/* Per month table */}
      <Card>
        <CardHeader>
          <CardTitle>月份明細</CardTitle>
          <CardDescription>
            每個月的新病人數量、回購人數與首次治療收入。注意：最近幾個月因為還沒給足時間轉化，轉化率看起來會偏低。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">月份</th>
                  <th className="px-4 py-3 text-right font-medium">新病人</th>
                  <th className="px-4 py-3 text-right font-medium">已回購</th>
                  <th className="px-4 py-3 text-right font-medium">轉化率</th>
                  <th className="px-4 py-3 text-right font-medium">
                    首次治療收入
                  </th>
                  <th className="px-4 py-3 text-right font-medium">平均客單</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stats.points.map((p) => (
                  <tr key={p.month} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono text-neutral-700">
                      {p.month}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {p.newPatientCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {p.convertedToSecond}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#6A5BA3]">
                      {p.newPatientCount > 0
                        ? `${(p.conversionRate * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatTWD(p.firstVisitRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">
                      {p.newPatientCount > 0
                        ? formatTWD(p.averageFirstVisitRevenue)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
