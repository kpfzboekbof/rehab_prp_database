import Link from "next/link";
import { BodyPart, Gender } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BODY_PART_LABELS, BODY_PART_OPTIONS } from "@/lib/body-parts";
import { formatTWD } from "@/lib/currency";
import { ageAt, formatDateTW } from "@/lib/date";
import { listActiveProducts } from "@/server/queries/products";
import {
  RESEARCH_ROW_CAP,
  searchResearch,
  type ResearchFilters,
} from "@/server/queries/research";
import { requireRole } from "@/server/rbac";

interface ResearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function normaliseFilters(raw: Record<string, string | undefined>): {
  filters: ResearchFilters;
  hasAny: boolean;
} {
  const trim = (v: string | undefined) =>
    v && v.trim() !== "" ? v.trim() : undefined;

  const bodyPart = trim(raw.bodyPart) as BodyPart | undefined;
  const gender = trim(raw.gender) as Gender | undefined;
  const productId = trim(raw.productId);
  const dateFrom = trim(raw.dateFrom);
  const dateTo = trim(raw.dateTo);

  const ageMinRaw = trim(raw.ageMin);
  const ageMaxRaw = trim(raw.ageMax);
  const ageMinNum = ageMinRaw ? Number.parseInt(ageMinRaw, 10) : NaN;
  const ageMaxNum = ageMaxRaw ? Number.parseInt(ageMaxRaw, 10) : NaN;
  const ageMin = Number.isFinite(ageMinNum) ? ageMinNum : undefined;
  const ageMax = Number.isFinite(ageMaxNum) ? ageMaxNum : undefined;

  const filters: ResearchFilters = {
    bodyPart,
    gender,
    productId,
    dateFrom,
    dateTo,
    ageMin,
    ageMax,
  };
  const hasAny =
    bodyPart != null ||
    gender != null ||
    productId != null ||
    dateFrom != null ||
    dateTo != null ||
    ageMin != null ||
    ageMax != null;
  return { filters, hasAny };
}

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "男",
  FEMALE: "女",
  OTHER: "其他",
};

export default async function ResearchPage({ searchParams }: ResearchPageProps) {
  await requireRole(["DOCTOR", "ADMIN"]);

  const raw = await searchParams;
  const { filters, hasAny } = normaliseFilters(raw);

  const products = await listActiveProducts();

  const result = hasAny
    ? await searchResearch(filters)
    : { rows: [], truncated: false, total: 0 };

  // Build the CSV URL preserving all current filter values.
  const csvParams = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && v !== "") csvParams.set(k, v);
  }
  const csvUrl = `/api/research/export?${csvParams.toString()}`;

  const selectClass =
    "flex h-11 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-base sm:h-10 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">研究資料庫</h1>
        <p className="mt-1 text-sm text-neutral-600">
          依條件篩選 PRP 治療紀錄，供品管、追蹤或研究使用。CSV 匯出為去識別化資料（不含姓名、病歷號、生日）。
        </p>
      </div>

      {/* Filter form */}
      <Card>
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
          <CardDescription>所有條件為 AND。留空代表不限制。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/research"
            method="get"
            className="flex flex-col gap-5"
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bodyPart">部位</Label>
                <select
                  id="bodyPart"
                  name="bodyPart"
                  defaultValue={raw.bodyPart ?? ""}
                  className={selectClass}
                >
                  <option value="">不限</option>
                  {BODY_PART_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="gender">性別</Label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={raw.gender ?? ""}
                  className={selectClass}
                >
                  <option value="">不限</option>
                  <option value="MALE">男</option>
                  <option value="FEMALE">女</option>
                  <option value="OTHER">其他</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="productId">PRP 品項</Label>
                <select
                  id="productId"
                  name="productId"
                  defaultValue={raw.productId ?? ""}
                  className={selectClass}
                >
                  <option value="">不限</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>年齡區間</Label>
                <div className="flex items-center gap-2">
                  <Input
                    name="ageMin"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="min"
                    defaultValue={raw.ageMin ?? ""}
                  />
                  <span className="text-sm text-neutral-500">–</span>
                  <Input
                    name="ageMax"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="max"
                    defaultValue={raw.ageMax ?? ""}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="dateFrom">治療日期（起）</Label>
                <Input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  defaultValue={raw.dateFrom ?? ""}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="dateTo">治療日期（迄）</Label>
                <Input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  defaultValue={raw.dateTo ?? ""}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit">套用篩選</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/research">清除</Link>
              </Button>
              {hasAny && result.rows.length > 0 && (
                <Button asChild type="button" variant="outline">
                  <a href={csvUrl} download>
                    匯出 CSV（去識別化）
                  </a>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {hasAny ? (
        <Card>
          <CardHeader>
            <CardTitle>
              篩選結果
              <span className="ml-2 text-sm font-normal text-neutral-500">
                {result.total > 0 ? `共 ${result.total} 筆` : "沒有符合條件的紀錄"}
                {result.truncated && `（顯示前 ${RESEARCH_ROW_CAP} 筆）`}
              </span>
            </CardTitle>
            <CardDescription>
              畫面上顯示病人姓名與病歷號供臨床參考。CSV 匯出會自動去識別化。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.rows.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">
                沒有符合條件的紀錄
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-3 py-3 font-medium">治療日期</th>
                      <th className="px-3 py-3 font-medium">病人</th>
                      <th className="px-3 py-3 font-medium">年齡/性別</th>
                      <th className="px-3 py-3 font-medium">部位</th>
                      <th className="px-3 py-3 font-medium">品項</th>
                      <th className="px-3 py-3 text-right font-medium">購入</th>
                      <th className="px-3 py-3 text-right font-medium">注射</th>
                      <th className="px-3 py-3 text-right font-medium">金額</th>
                      <th className="px-3 py-3 font-medium">醫師</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {result.rows.map((r) => (
                      <tr key={r.id} className="hover:bg-neutral-50">
                        <td className="px-3 py-3 text-neutral-700">
                          {formatDateTW(r.treatmentDate)}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/patients/${r.patient.id}`}
                            className="font-medium text-neutral-900 hover:underline"
                          >
                            {r.patient.name}
                          </Link>
                          <div className="font-mono text-[10px] text-neutral-500">
                            {r.patient.chartNumber}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-neutral-700">
                          {ageAt(r.patient.birthDate)} 歲 /{" "}
                          {GENDER_LABELS[r.patient.gender]}
                        </td>
                        <td className="px-3 py-3 text-neutral-700">
                          {BODY_PART_LABELS[r.bodyPart]}
                          {r.bodyPartDetail && (
                            <div className="text-[10px] text-neutral-500">
                              {r.bodyPartDetail}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-neutral-700">
                          {r.product.name}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-neutral-700">
                          {r.quantity}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-neutral-700">
                          {r.vialsUsed}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-neutral-900">
                          {r.totalAmount > 0 ? formatTWD(r.totalAmount) : "—"}
                        </td>
                        <td className="px-3 py-3 text-neutral-600">
                          {r.doctor.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
          請先設定篩選條件並按「套用篩選」
        </div>
      )}

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>去識別化說明：</strong>
        CSV 匯出會以「年齡」代替生日，並省略姓名、病歷號。畫面上的完整資訊僅供院內臨床研究參考，不會進入匯出檔。結果最多顯示 {RESEARCH_ROW_CAP} 筆，若超過請進一步縮小條件。
      </div>
    </div>
  );
}
