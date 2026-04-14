import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTWD } from "@/lib/currency";
import { formatDateTW } from "@/lib/date";
import { getRetentionStats } from "@/server/queries/insights";
import { requireRole } from "@/server/rbac";

export default async function RetentionInsightsPage() {
  await requireRole(["DOCTOR", "ADMIN"]);
  const stats = await getRetentionStats();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/analytics" className="underline-offset-4 hover:underline">
          業務分析
        </Link>
        <span className="mx-2">/</span>
        <span>回購分析</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">重複購買率分析</h1>
        <p className="mt-1 text-sm text-neutral-600">
          有付費過的病人，多少比例回來打第二次？平均打幾次？看這個決定是否該多花力氣做衛教與回診提醒。
        </p>
      </div>

      {/* Overall summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="付費病人總數"
          value={String(stats.totalPayingPatients)}
          hint="至少有一次收費治療"
        />
        <SummaryCard
          label="回購病人"
          value={String(stats.repeatPatients)}
          hint={`佔 ${(stats.repeatRate * 100).toFixed(1)}%`}
          accent
        />
        <SummaryCard
          label="平均治療次數"
          value={stats.averageChargingCountPerPatient.toFixed(1)}
          hint="每位付費病人"
        />
        <SummaryCard
          label="平均終身價值"
          value={formatTWD(Math.round(stats.averageLifetimeRevenue))}
          hint="每位付費病人"
          accent
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>首次 → 第二次間隔</CardTitle>
          <CardDescription>
            第一次收費治療到第二次收費治療的天數中位數，可以當作「回診提醒的最佳時機」參考。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.medianDaysToSecond == null ? (
            <div className="py-4 text-sm text-neutral-500">
              尚無回購資料可計算
            </div>
          ) : (
            <div className="text-3xl font-light text-[#6A5BA3]">
              {stats.medianDaysToSecond} 天
              <span className="ml-3 text-sm text-neutral-500">（中位數）</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cohort table */}
      <Card>
        <CardHeader>
          <CardTitle>月份 cohort</CardTitle>
          <CardDescription>
            依「第一次收費治療的月份」分組，觀察各月新客戶的回購率。越近期的月份因為還沒給足時間，回購率通常較低。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.cohorts.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">
              尚無資料
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">月份</th>
                    <th className="px-4 py-3 text-right font-medium">新客戶數</th>
                    <th className="px-4 py-3 text-right font-medium">回購人數</th>
                    <th className="px-4 py-3 text-right font-medium">回購率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {stats.cohorts.map((c) => (
                    <tr key={c.month} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-mono text-neutral-700">
                        {c.month}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {c.cohortSize}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {c.repeated}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#6A5BA3]">
                        {(c.repeatRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top patients */}
      <Card>
        <CardHeader>
          <CardTitle>終身價值前 10 名病人</CardTitle>
          <CardDescription>
            累計消費最高的病人。這些是 VIP，值得多花一點時間在他們身上。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topPatients.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">
              尚無資料
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">病人</th>
                    <th className="px-4 py-3 text-right font-medium">治療次數</th>
                    <th className="px-4 py-3 text-right font-medium">累計消費</th>
                    <th className="px-4 py-3 font-medium">首次治療</th>
                    <th className="px-4 py-3 font-medium">最近治療</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {stats.topPatients.map((p) => (
                    <tr key={p.patientId} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/patients/${p.patientId}`}
                          className="font-medium text-[#1D697C] underline-offset-4 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-neutral-500">
                          {p.chartNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {p.chargingCount}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#6A5BA3]">
                        {formatTWD(p.lifetimeRevenue)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatDateTW(p.firstTreatmentDate)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatDateTW(p.lastTreatmentDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
