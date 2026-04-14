import { NextResponse } from "next/server";

import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { formatTWD } from "@/lib/currency";
import { getMonthlyReport } from "@/server/queries/reports";
import { requireRole } from "@/server/rbac";

/**
 * CSV export for the monthly revenue / commission report.
 *
 * Access:
 * - ADMIN   → sees all doctors
 * - DOCTOR  → limited to their own doctorId (server-side scope)
 * - STAFF   → blocked
 *
 * Query params: ?year=YYYY&month=MM
 */
export async function GET(request: Request) {
  const session = await requireRole(["DOCTOR", "ADMIN"]);

  const url = new URL(request.url);
  const year = Number.parseInt(url.searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(url.searchParams.get("month") ?? "", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json(
      { error: "year / month 參數缺失或不合法" },
      { status: 400 },
    );
  }

  const report = await getMonthlyReport({
    year,
    month,
    doctorId: session.user.role === "DOCTOR" ? session.user.id : undefined,
  });

  // CSV structure: three stacked sections with blank-row separators.
  const rows: Array<Array<unknown>> = [];

  rows.push([`${year} 年 ${month} 月 業績報表`]);
  rows.push([]);
  rows.push(["總覽"]);
  rows.push(["治療紀錄數", report.totals.treatmentCount]);
  rows.push(["收費筆數", report.totals.chargingCount]);
  rows.push(["不同病人數", report.totals.distinctPatientCount]);
  rows.push(["總收入", formatTWD(report.totals.grossRevenue)]);
  rows.push(["總抽成", formatTWD(report.totals.totalCommission)]);
  rows.push([]);

  rows.push(["醫師別"]);
  rows.push([
    "醫師",
    "Email",
    "治療筆數",
    "收費筆數",
    "總收入",
    "平均抽成比例",
    "抽成金額",
  ]);
  for (const d of report.perDoctor) {
    rows.push([
      d.doctorName,
      d.doctorEmail,
      d.treatmentCount,
      d.chargingCount,
      formatTWD(d.grossRevenue),
      `${(d.averageCommissionRate * 100).toFixed(1)}%`,
      formatTWD(d.totalCommission),
    ]);
  }
  rows.push([]);

  rows.push(["PRP 品項別"]);
  rows.push([
    "品項",
    "套組瓶數",
    "治療筆數",
    "累計購入瓶數",
    "累計使用瓶數",
    "收入",
  ]);
  for (const p of report.perProduct) {
    rows.push([
      p.productName,
      p.packageSize ?? "—",
      p.treatmentCount,
      p.vialsPurchased,
      p.vialsUsed,
      formatTWD(p.grossRevenue),
    ]);
  }

  const csv = toCsv(null, rows);

  return new NextResponse(csv, {
    headers: csvResponseHeaders(
      `monthly-report-${year}-${String(month).padStart(2, "0")}.csv`,
    ),
  });
}
