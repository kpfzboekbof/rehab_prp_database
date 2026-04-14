import { Prisma } from "@prisma/client";

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

export async function getMonthlyReport({
  year,
  month,
  doctorId,
}: MonthlyReportParams): Promise<MonthlyReport> {
  const { start, end } = monthWindow(year, month);

  const baseWhere: Prisma.TreatmentRecordWhereInput = {
    treatmentDate: { gte: start, lt: end },
    ...(doctorId ? { doctorId } : {}),
  };

  // --- Totals ---
  const [totalsAgg, chargingCountAgg, distinctPatientsAgg] = await Promise.all([
    db.treatmentRecord.aggregate({
      where: baseWhere,
      _count: { id: true },
      _sum: { totalAmount: true, commissionAmount: true },
    }),
    db.treatmentRecord.count({
      where: { ...baseWhere, totalAmount: { gt: 0 } },
    }),
    db.treatmentRecord.findMany({
      where: baseWhere,
      distinct: ["patientId"],
      select: { patientId: true },
    }),
  ]);

  const totals: MonthlyReportTotals = {
    treatmentCount: totalsAgg._count.id,
    chargingCount: chargingCountAgg,
    grossRevenue: totalsAgg._sum.totalAmount ?? 0,
    totalCommission: totalsAgg._sum.commissionAmount ?? 0,
    distinctPatientCount: distinctPatientsAgg.length,
  };

  // --- Per doctor ---
  const perDoctorAgg = await db.treatmentRecord.groupBy({
    by: ["doctorId"],
    where: baseWhere,
    _count: { id: true },
    _sum: { totalAmount: true, commissionAmount: true },
  });

  // We need a second aggregate to get "charging count" per doctor
  // (Prisma groupBy only supports one where per query, so do one more).
  const perDoctorChargingAgg = await db.treatmentRecord.groupBy({
    by: ["doctorId"],
    where: { ...baseWhere, totalAmount: { gt: 0 } },
    _count: { id: true },
  });
  const chargingCountByDoctor = new Map(
    perDoctorChargingAgg.map((r) => [r.doctorId, r._count.id]),
  );

  const doctorIds = perDoctorAgg.map((d) => d.doctorId);
  const doctors = await db.user.findMany({
    where: { id: { in: doctorIds } },
    select: { id: true, name: true, email: true },
  });
  const doctorsById = new Map(doctors.map((d) => [d.id, d]));

  const perDoctor: MonthlyReportDoctorRow[] = perDoctorAgg
    .map((row) => {
      const u = doctorsById.get(row.doctorId);
      const revenue = row._sum.totalAmount ?? 0;
      const commission = row._sum.commissionAmount ?? 0;
      return {
        doctorId: row.doctorId,
        doctorName: u?.name ?? "（未知）",
        doctorEmail: u?.email ?? "",
        treatmentCount: row._count.id,
        chargingCount: chargingCountByDoctor.get(row.doctorId) ?? 0,
        grossRevenue: revenue,
        totalCommission: commission,
        averageCommissionRate: revenue > 0 ? commission / revenue : 0,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  // --- Per product ---
  const perProductAgg = await db.treatmentRecord.groupBy({
    by: ["productId"],
    where: baseWhere,
    _count: { id: true },
    _sum: {
      totalAmount: true,
      quantity: true,
      vialsUsed: true,
    },
  });
  const productIds = perProductAgg.map((p) => p.productId);
  const products = await db.pRPProduct.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, packageSize: true },
  });
  const productsById = new Map(products.map((p) => [p.id, p]));

  const perProduct: MonthlyReportProductRow[] = perProductAgg
    .map((row) => {
      const p = productsById.get(row.productId);
      return {
        productId: row.productId,
        productName: p?.name ?? "（未知）",
        packageSize: p?.packageSize ?? null,
        treatmentCount: row._count.id,
        vialsPurchased: row._sum.quantity ?? 0,
        vialsUsed: row._sum.vialsUsed ?? 0,
        grossRevenue: row._sum.totalAmount ?? 0,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  return {
    year,
    month,
    totals,
    perDoctor,
    perProduct,
    filteredToDoctorId: doctorId ?? null,
  };
}
