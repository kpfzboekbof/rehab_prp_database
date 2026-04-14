import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APPOINTMENT_SESSION_LABELS } from "@/lib/appointment-session";
import { formatDateTW } from "@/lib/date";
import { getSessionUtilisation } from "@/server/queries/insights";
import { requireRole } from "@/server/rbac";

interface SessionsInsightsPageProps {
  searchParams: Promise<{ months?: string }>;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_OPTIONS = [1, 3, 6, 12];

export default async function SessionsInsightsPage({
  searchParams,
}: SessionsInsightsPageProps) {
  await requireRole(["DOCTOR", "ADMIN"]);
  const params = await searchParams;

  const raw = Number.parseInt(params.months ?? "", 10);
  const monthsBack = Number.isFinite(raw) && raw >= 1 && raw <= 24 ? raw : 3;

  const stats = await getSessionUtilisation({ monthsBack });

  // Build a sessions × weekdays matrix for the heatmap.
  const matrix: Record<string, number> = {};
  let maxCount = 0;
  for (const cell of stats.heatmap) {
    matrix[`${cell.session}|${cell.weekday}`] = cell.count;
    if (cell.count > maxCount) maxCount = cell.count;
  }

  const sessionsOrder: Array<"MORNING" | "AFTERNOON" | "EVENING"> = [
    "MORNING",
    "AFTERNOON",
    "EVENING",
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/analytics" className="underline-offset-4 hover:underline">
          業務分析
        </Link>
        <span className="mx-2">/</span>
        <span>診次使用率</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">診次使用率</h1>
        <p className="mt-1 text-sm text-neutral-600">
          各診次（早/午/晚）跟各星期的預約人次分布。用來決定哪一個時段還有空可以塞更多病人，哪一個時段已經滿到需要調整。取消的預約不計入。
        </p>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-3 text-sm">
        <span className="text-neutral-600">統計區間：近</span>
        {MONTH_OPTIONS.map((m) => (
          <Link
            key={m}
            href={{ pathname: "/reports/insights/sessions", query: { months: m } }}
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
        <span className="ml-auto text-xs text-neutral-500">
          {formatDateTW(stats.rangeStart)} ~ {formatDateTW(stats.rangeEnd)}
        </span>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="總預約人次"
          value={String(stats.total)}
          hint="不含取消"
        />
        {sessionsOrder.map((s) => {
          const count = stats.perSession[s];
          const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
          return (
            <SummaryCard
              key={s}
              label={APPOINTMENT_SESSION_LABELS[s]}
              value={String(count)}
              hint={`${pct.toFixed(1)}%`}
              accent={s === "MORNING"}
            />
          );
        })}
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>診次 × 星期熱度圖</CardTitle>
          <CardDescription>
            顏色越深代表該時段預約越多。空格代表這個時段近期沒有任何預約 — 可能是還沒開診，也可能是有空的時段。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">診次</th>
                  {WEEKDAYS.map((w) => (
                    <th key={w} className="px-3 py-3 text-center font-medium">
                      週{w}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sessionsOrder.map((s) => {
                  const rowTotal = stats.perSession[s];
                  return (
                    <tr key={s}>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {APPOINTMENT_SESSION_LABELS[s]}
                      </td>
                      {WEEKDAYS.map((_, wd) => {
                        const count = matrix[`${s}|${wd}`] ?? 0;
                        const intensity =
                          maxCount > 0 ? count / maxCount : 0;
                        return (
                          <td
                            key={wd}
                            className="px-2 py-2 text-center align-middle"
                          >
                            <div
                              className="mx-auto flex h-10 min-w-[2.5rem] items-center justify-center rounded font-mono text-sm"
                              style={
                                count === 0
                                  ? {
                                      background: "#f5f5f5",
                                      color: "#a3a3a3",
                                    }
                                  : {
                                      background: `rgba(106, 91, 163, ${0.12 + intensity * 0.7})`,
                                      color:
                                        intensity > 0.5 ? "#fff" : "#3a3065",
                                    }
                              }
                            >
                              {count}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>怎麼用這個圖？</strong>
        如果某個格子一直是空的，代表該時段還沒開放預約，或還有很多餘裕可以塞新客。反之，深色格子的時段如果每週都滿，應該考慮開第二診或把複診塞到其他時段。
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
