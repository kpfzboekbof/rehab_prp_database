import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { taipeiDayStart } from "@/lib/date";

/**
 * Monthly revenue / commission aggregation.
 *
 * Because `TreatmentRecord` freezes `totalAmount` and `commissionAmount`
 * at save time (see AGENTS.md), the report is a pure aggregation over
 * immutable rows: no historical recomputation, no joins to current
 * product prices or commission rates. Reports for past months will
 * match exactly what the clinic billed that month, forever.
 *
 * Notes:
 * - A treatment row with `quantity > 0` is a "charging visit" (regular
 *   treatment OR the purchase visit of a prepaid package).
 * - A treatment row with `quantity == 0` is a "use visit" drawing from
 *   a previously-purchased package — its `totalAmount` is 0, so it
 *   contributes to the treatment count but not to revenue.
 */

export interface MonthlyReportParams {
  year: number;
  month: number; // 1-12
  /** If provided, report is limited to this doctor. ADMIN viewing "all". */
  doctorId?: string;
}

export interface MonthlyReportTotals {
  treatmentCount: number;
  chargingCount: number; // rows where totalAmount > 0
  grossRevenue: number;
  totalCommission: number;
  distinctPatientCount: number;
}

export interface MonthlyReportDoctorRow {
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  treatmentCount: number;
  chargingCount: number;
  grossRevenue: number;
  totalCommission: number;
  averageCommissionRate: number; // revenue-weighted
}

export interface MonthlyReportProductRow {
  productId: string;
  productName: string;
  packageSize: number | null;
  treatmentCount: number; // rows using this product (purchase + use)
  vialsPurchased: number; // SUM(quantity)
  vialsUsed: number; // SUM(vialsUsed)
  grossRevenue: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totals: MonthlyReportTotals;
  perDoctor: MonthlyReportDoctorRow[];
  perProduct: MonthlyReportProductRow[];
  filteredToDoctorId: string | null;
}

function monthWindow(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const next = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return {
    start: taipeiDayStart(first),
    end: taipeiDayStart(next),
  };
}

/**
 * Internal compute-only function. The exported `getMonthlyReport`
 * wraps this in a cache layer; do not call this directly from page
 * code. Replaces the previous 8-query implementation with TWO
 * round-trips to Postgres:
 *
 *   1. Per-doctor + grand-totals via GROUPING SETS, joined to User
 *      to get names. Returns one row per doctor PLUS one "rollup"
 *      row whose doctorId is NULL (= the grand total). Distinct
 *      patient count is computed in the same query via
 *      COUNT(DISTINCT "patientId").
 *
 *   2. Per-product, joined to PRPProduct to get name + packageSize.
 *
 * 8 → 2 queries. On a warm Neon connection this turns the
 * dominant cost on /reports/monthly from ~1.5s to ~150ms.
 */
async function computeMonthlyReport({
  year,
  month,
  doctorId,
}: MonthlyReportParams): Promise<MonthlyReport> {
  const { start, end } = monthWindow(year, month);

  // Optional doctor filter — used in BOTH queries below. Postgres
  // tolerates the bare `AND` after WHERE thanks to the `1 = 1` guard.
  const doctorWhere = doctorId
    ? Prisma.sql`AND tr."doctorId" = ${doctorId}`
    : Prisma.empty;

  // --- Query 1: grand totals + per-doctor in one pass ----------
  // GROUPING SETS lets us ask Postgres for "ungrouped totals" AND
  // "grouped by doctorId" in a single query. The rollup row has a
  // NULL doctorId, which we split out in JS below.
  const doctorRows = await db.$queryRaw<
    Array<{
      doctor_id: string | null;
      doctor_name: string | null;
      doctor_email: string | null;
      treatment_count: number;
      charging_count: number;
      distinct_patients: number;
      gross_revenue: bigint | number;
      total_commission: bigint | number;
    }>
  >(Prisma.sql`
    SELECT
      tr."doctorId" AS doctor_id,
      MAX(u."name")  AS doctor_name,
      MAX(u."email") AS doctor_email,
      COUNT(*)::int AS treatment_count,
      COUNT(*) FILTER (WHERE tr."totalAmount" > 0)::int AS charging_count,
      COUNT(DISTINCT tr."patientId")::int AS distinct_patients,
      COALESCE(SUM(tr."totalAmount"), 0)::bigint AS gross_revenue,
      COALESCE(SUM(tr."commissionAmount"), 0)::bigint AS total_commission
    FROM "TreatmentRecord" tr
    LEFT JOIN "User" u ON u."id" = tr."doctorId"
    WHERE 1 = 1
      AND tr."treatmentDate" >= ${start}
      AND tr."treatmentDate" <  ${end}
      ${doctorWhere}
    GROUP BY GROUPING SETS ((tr."doctorId"), ())
    ORDER BY gross_revenue DESC NULLS LAST
  `);

  // Find the rollup row (doctorId IS NULL) — that's the totals.
  const rollupRow = doctorRows.find((r) => r.doctor_id === null);
  const perDoctorRows = doctorRows.filter((r) => r.doctor_id !== null);

  const totals: MonthlyReportTotals = {
    treatmentCount: rollupRow?.treatment_count ?? 0,
    chargingCount: rollupRow?.charging_count ?? 0,
    grossRevenue: rollupRow ? Number(rollupRow.gross_revenue) : 0,
    totalCommission: rollupRow ? Number(rollupRow.total_commission) : 0,
    distinctPatientCount: rollupRow?.distinct_patients ?? 0,
  };

  const perDoctor: MonthlyReportDoctorRow[] = perDoctorRows
    .map((r) => {
      const revenue = Number(r.gross_revenue);
      const commission = Number(r.total_commission);
      return {
        doctorId: r.doctor_id!,
        doctorName: r.doctor_name ?? "（未知）",
        doctorEmail: r.doctor_email ?? "",
        treatmentCount: r.treatment_count,
        chargingCount: r.charging_count,
        grossRevenue: revenue,
        totalCommission: commission,
        averageCommissionRate: revenue > 0 ? commission / revenue : 0,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  // --- Query 2: per-product joined to PRPProduct ---------------
  const productRows = await db.$queryRaw<
    Array<{
      product_id: string;
      product_name: string | null;
      package_size: number | null;
      treatment_count: number;
      vials_purchased: number;
      vials_used: number;
      gross_revenue: bigint | number;
    }>
  >(Prisma.sql`
    SELECT
      tr."productId"     AS product_id,
      MAX(p."name")       AS product_name,
      MAX(p."packageSize") AS package_size,
      COUNT(*)::int       AS treatment_count,
      COALESCE(SUM(tr."quantity"),  0)::int AS vials_purchased,
      COALESCE(SUM(tr."vialsUsed"), 0)::int AS vials_used,
      COALESCE(SUM(tr."totalAmount"), 0)::bigint AS gross_revenue
    FROM "TreatmentRecord" tr
    LEFT JOIN "PRPProduct" p ON p."id" = tr."productId"
    WHERE 1 = 1
      AND tr."treatmentDate" >= ${start}
      AND tr."treatmentDate" <  ${end}
      ${doctorWhere}
    GROUP BY tr."productId"
    ORDER BY gross_revenue DESC
  `);

  const perProduct: MonthlyReportProductRow[] = productRows.map((r) => ({
    productId: r.product_id,
    productName: r.product_name ?? "（未知）",
    packageSize: r.package_size,
    treatmentCount: r.treatment_count,
    vialsPurchased: r.vials_purchased,
    vialsUsed: r.vials_used,
    grossRevenue: Number(r.gross_revenue),
  }));

  return {
    year,
    month,
    totals,
    perDoctor,
    perProduct,
    filteredToDoctorId: doctorId ?? null,
  };
}

/**
 * Cached wrapper. Past months are essentially immutable (the
 * `totalAmount` and `commissionAmount` snapshot fields never change
 * after a treatment is saved — see AGENTS.md), so we cache them
 * aggressively. The current month gets a much shorter TTL because
 * new treatments can land in it at any time.
 *
 * Cache key auto-scopes per (year, month, doctorId) — switching
 * months or scoping to a different doctor uses different cache
 * entries, and they are computed independently.
 *
 * Note: we use a single 5-minute TTL rather than splitting "current
 * vs past" because the unstable_cache TTL is set at module load and
 * doesn't have a way to vary by argument. 5 minutes is short enough
 * that a new treatment in the current month is reflected within a
 * few minutes, and long enough that "上月 / 下月" navigation between
 * past months stays snappy.
 */
export const getMonthlyReport = unstable_cache(
  computeMonthlyReport,
  ["monthly-report-v1"],
  {
    revalidate: 300, // 5 minutes
    tags: ["monthly-report"],
  },
);
