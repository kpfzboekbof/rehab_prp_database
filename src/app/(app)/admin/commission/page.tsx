import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteRateButton } from "@/components/commission/delete-rate-button";
import { formatDateTW } from "@/lib/date";
import { listDoctorsWithRates } from "@/server/queries/commission";
import { requireRole } from "@/server/rbac";

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export default async function AdminCommissionPage() {
  // Explicit role check both for defense-in-depth and to force this page to
  // render dynamically (it reads cookies via `auth()`).
  await requireRole(["ADMIN"]);

  const doctors = await listDoctorsWithRates();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">醫師抽成設定</h1>
          <p className="mt-1 text-sm text-neutral-600">
            維護每位醫師的抽成比例。新規則會自動關閉前一筆規則，歷史沿革完整保留。
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/commission/new">新增抽成規則</Link>
        </Button>
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
          尚無醫師或管理員帳號。請先至「使用者管理」建立 DOCTOR 或 ADMIN 角色的使用者。
        </div>
      ) : (
        <div className="space-y-4">
          {doctors.map((d) => (
            <Card key={d.id} className={d.active ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      {d.name}
                      {d.role === "ADMIN" && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-400/30">
                          管理員 / 醫師
                        </span>
                      )}
                      {!d.active && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-400/30">
                          帳號停用
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{d.email}</CardDescription>
                  </div>
                  <div className="text-right">
                    {d.currentRate ? (
                      <div>
                        <div className="text-xs text-neutral-500">目前抽成比例</div>
                        <div className="text-3xl font-semibold text-neutral-900">
                          {formatPercent(d.currentRate.rate)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          自 {formatDateTW(d.currentRate.effectiveFrom)} 起
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        尚未設定抽成
                        <br />
                        新建治療紀錄將以 0% 計算
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/commission/new?doctorId=${d.id}`}>
                      調整抽成
                    </Link>
                  </Button>
                  {d.currentRate && (
                    <DeleteRateButton
                      rateId={d.currentRate.id}
                      doctorName={d.name}
                      ratePercent={Number(formatPercent(d.currentRate.rate).replace("%", ""))}
                    />
                  )}
                </div>

                {d.commissionRates.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      完整歷史（{d.commissionRates.length} 筆）
                    </div>
                    <div className="overflow-x-auto rounded-md border border-neutral-200">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                          <tr>
                            <th className="px-3 py-2 font-medium">生效期間</th>
                            <th className="px-3 py-2 font-medium">比例</th>
                            <th className="px-3 py-2 font-medium">備註</th>
                            <th className="px-3 py-2 font-medium">狀態</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {d.commissionRates.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-neutral-700">
                                {formatDateTW(r.effectiveFrom)}
                                <span className="mx-1 text-neutral-400">→</span>
                                {r.effectiveTo ? formatDateTW(r.effectiveTo) : "目前"}
                              </td>
                              <td className="px-3 py-2 font-mono font-medium">
                                {formatPercent(r.rate)}
                              </td>
                              <td className="px-3 py-2 text-neutral-600">
                                {r.note || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {r.effectiveTo === null ? (
                                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                    有效中
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 ring-1 ring-inset ring-neutral-400/30">
                                    已取代
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>關於歷史沿革：</strong>
        每筆治療紀錄在建立時會 snapshot 當下的醫師抽成比例，因此調整抽成 <em>不會</em> 影響已經建立的治療紀錄的抽成金額。月報表以 snapshot 為準。
      </div>
    </div>
  );
}
