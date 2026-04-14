import type { AppointmentSession } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { taipeiDayStart } from "@/lib/date";

/**
 * "Insights" = higher-order analytics on top of the monthly report.
 *
 * Each function answers one question that the clinic owner asks us
 * roughly once a month:
 *
 *   getMonthlyTrend           — "how has my business trended over the
 *                                last N months?"
 *   getRetentionStats         — "what fraction of patients come back?"
 *   getSessionUtilisation     — "which session (早/午/晚) is busiest?"
 *   getNewPatientFunnel       — "how many new patients per month, and
 *                                how many convert to a second visit?"
 *
 * All aggregations go through `TreatmentRecord` snapshot fields, so
 * changing current prices / commission never moves historical numbers
 * (see AGENTS.md).
 */

// ---------------------------------------------------------------
// #8 — Monthly trend (last N months)
// ---------------------------------------------------------------

export interface MonthlyTrendPoint {
  /** "YYYY-MM" — Taipei calendar month key. */
  month: string;
  year: number;
  monthNumber: number;
  treatmentCount: number;
  chargingCount: number;
  distinctPatientCount: number;
  newPatientCount: number;
  grossRevenue: number;
  totalCommission: number;
}

export interface MonthlyTrendParams {
  monthsBack: number; // inclusive of current month, e.g. 12 → 12 months
  doctorId?: string;
}

function taipeiMonthWindow(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const next = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { start: taipeiDayStart(first), end: taipeiDayStart(next) };
}

function currentTaipeiYearMonth(): [number, number] {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m] = formatted.split("-").map(Number);
  return [y, m];
}

/**
 * Raw row shape returned by the Postgres CTE below. Bigints come back
 * for `SUM(int)` results; we coerce them to JS Number on the way out
 * (revenue stays well within safe-integer range for any realistic
 * clinic).
 */
interface MonthlyTrendRawRow {
  month_key: string;
  treatment_count: number;
  charging_count: number;
  distinct_patients: number;
  new_patients: number;
  gross_revenue: bigint | number;
  total_commission: bigint | number;
}

/**
 * Internal compute-only function. The exported `getMonthlyTrend`
 * wraps this in `unstable_cache` so repeated reads (e.g. the user
 * clicking "上月" / "下月" on the monthly report) hit the cache
 * instead of re-running the SQL.
 *
 * Implementation: ONE round-trip to Postgres. The previous version
 * ran 12 × 4 = 48 separate Prisma queries, which against Neon over
 * the network was the dominant cost of /reports/monthly (≈4 seconds
 * wall time). This CTE computes all 12 monthly buckets + the new-
 * patient count in a single query that Postgres can plan and execute
 * in well under 100ms.
 *
 * "New patient in month M" semantics: a patient whose FIRST EVER
 * treatment (subject to the same `doctorId` filter, when scoped to a
 * single doctor) lands in month M. Computed with a CTE that takes
 * MIN(treatmentDate) per patient, bucketed by Taipei calendar month.
 */
async function computeMonthlyTrend({
  monthsBack,
  doctorId,
}: MonthlyTrendParams): Promise<MonthlyTrendPoint[]> {
  const [currentYear, currentMonth] = currentTaipeiYearMonth();

  // Build the array of (year, month) buckets we want to return, walking
  // backwards from the current Taipei month. Used both as the SQL
  // window and to fill in zero-rows for months with no treatments.
  const windows: Array<{ year: number; month: number; key: string }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    windows.push({
      year: y,
      month: m,
      key: `${y}-${String(m).padStart(2, "0")}`,
    });
  }
  const oldestStart = taipeiMonthWindow(windows[0].year, windows[0].month).start;

  // Optional doctorId filter, injected into both the inner CTE (for
  // first-treatment-per-patient) and the per-month aggregation. We
  // keep the column name unqualified so it works against the bare
  // table reference inside both CTEs.
  const doctorWhere = doctorId
    ? Prisma.sql`AND "doctorId" = ${doctorId}`
    : Prisma.empty;

  const rows = await db.$queryRaw<MonthlyTrendRawRow[]>(Prisma.sql`
    WITH
      patient_first_month AS (
        SELECT
          "patientId",
          to_char((MIN("treatmentDate") AT TIME ZONE 'Asia/Taipei'), 'YYYY-MM') AS first_month
        FROM "TreatmentRecord"
        WHERE 1 = 1 ${doctorWhere}
        GROUP BY "patientId"
      ),
      monthly_agg AS (
        SELECT
          to_char(("treatmentDate" AT TIME ZONE 'Asia/Taipei'), 'YYYY-MM') AS month_key,
          COUNT(*)::int AS treatment_count,
          COUNT(*) FILTER (WHERE "totalAmount" > 0)::int AS charging_count,
          COUNT(DISTINCT "patientId")::int AS distinct_patients,
          COALESCE(SUM("totalAmount"), 0)::bigint AS gross_revenue,
          COALESCE(SUM("commissionAmount"), 0)::bigint AS total_commission
        FROM "TreatmentRecord"
        WHERE "treatmentDate" >= ${oldestStart} ${doctorWhere}
        GROUP BY to_char(("treatmentDate" AT TIME ZONE 'Asia/Taipei'), 'YYYY-MM')
      ),
      new_per_month AS (
        SELECT
          first_month AS month_key,
          COUNT(*)::int AS new_patients
        FROM patient_first_month
        WHERE first_month >= to_char((${oldestStart}::timestamptz AT TIME ZONE 'Asia/Taipei'), 'YYYY-MM')
        GROUP BY first_month
      )
    SELECT
      m.month_key,
      m.treatment_count,
      m.charging_count,
      m.distinct_patients,
      COALESCE(n.new_patients, 0)::int AS new_patients,
      m.gross_revenue,
      m.total_commission
    FROM monthly_agg m
    LEFT JOIN new_per_month n USING (month_key)
    ORDER BY m.month_key
  `);

  // Index the SQL results by month key so we can fill in zero-rows
  // for any windows the database had no data for.
  const byMonth = new Map<string, MonthlyTrendRawRow>();
  for (const row of rows) {
    byMonth.set(row.month_key, row);
  }

  return windows.map(({ year, month, key }): MonthlyTrendPoint => {
    const row = byMonth.get(key);
    return {
      month: key,
      year,
      monthNumber: month,
      treatmentCount: row?.treatment_count ?? 0,
      chargingCount: row?.charging_count ?? 0,
      distinctPatientCount: row?.distinct_patients ?? 0,
      newPatientCount: row?.new_patients ?? 0,
      grossRevenue: row ? Number(row.gross_revenue) : 0,
      totalCommission: row ? Number(row.total_commission) : 0,
    };
  });
}

/**
 * Cached wrapper around `computeMonthlyTrend`. The trend is "the
 * last 12 months from today" — it doesn't change when the user picks
 * a different month on the monthly report, so caching it makes
 * "上月 / 下月" navigation snappy. 10-minute TTL is plenty since
 * historical months cannot move and the current month moves slowly.
 *
 * Cache key is automatically scoped by the params object (so per-
 * doctor and unscoped versions cache separately).
 */
export const getMonthlyTrend = unstable_cache(
  computeMonthlyTrend,
  ["monthly-trend-v2"],
  {
    revalidate: 600, // 10 minutes
    tags: ["monthly-trend"],
  },
);

// ---------------------------------------------------------------
// #6 — Retention / repeat-purchase analysis
// ---------------------------------------------------------------

export interface RetentionStats {
  /** Patients who have at least one charging (totalAmount > 0) treatment. */
  totalPayingPatients: number;
  /** Paying patients with ≥2 charging treatments. */
  repeatPatients: number;
  /** repeatPatients / totalPayingPatients, or 0. */
  repeatRate: number;
  /** Average charging treatments per paying patient. */
  averageChargingCountPerPatient: number;
  /** Average lifetime revenue per paying patient. */
  averageLifetimeRevenue: number;
  /** Median days between first and second charging treatment (null if none). */
  medianDaysToSecond: number | null;
  /**
   * Per-month cohort table: patients grouped by the month of their first
   * charging treatment, showing how many later came back.
   */
  cohorts: RetentionCohortRow[];
  /** Top patients by lifetime revenue (de-identified: name shown). */
  topPatients: TopPatientRow[];
}

export interface RetentionCohortRow {
  /** "YYYY-MM" of first charging treatment. */
  month: string;
  cohortSize: number;
  repeated: number;
  repeatRate: number;
}

export interface TopPatientRow {
  patientId: string;
  name: string;
  chartNumber: string;
  chargingCount: number;
  lifetimeRevenue: number;
  firstTreatmentDate: Date;
  lastTreatmentDate: Date;
}

export async function getRetentionStats(): Promise<RetentionStats> {
  // Pull all charging treatments (not the "use visit" rows which have
  // totalAmount = 0). We need per-patient counts + first/last dates.
  const charging = await db.treatmentRecord.findMany({
    where: {
      totalAmount: { gt: 0 },
      patient: { deletedAt: null },
    },
    select: {
      patientId: true,
      treatmentDate: true,
      totalAmount: true,
    },
    orderBy: { treatmentDate: "asc" },
  });

  type PatientAggregate = {
    chargingCount: number;
    firstDate: Date;
    lastDate: Date;
    lifetimeRevenue: number;
    secondDate: Date | null;
  };
  const byPatient = new Map<string, PatientAggregate>();
  for (const t of charging) {
    const existing = byPatient.get(t.patientId);
    if (!existing) {
      byPatient.set(t.patientId, {
        chargingCount: 1,
        firstDate: t.treatmentDate,
        lastDate: t.treatmentDate,
        lifetimeRevenue: t.totalAmount,
        secondDate: null,
      });
    } else {
      existing.chargingCount += 1;
      existing.lifetimeRevenue += t.totalAmount;
      existing.lastDate = t.treatmentDate;
      if (existing.chargingCount === 2) {
        existing.secondDate = t.treatmentDate;
      }
    }
  }

  const totalPayingPatients = byPatient.size;
  let repeatPatients = 0;
  let totalCharging = 0;
  let totalRevenue = 0;
  const gaps: number[] = [];
  for (const p of byPatient.values()) {
    totalCharging += p.chargingCount;
    totalRevenue += p.lifetimeRevenue;
    if (p.chargingCount >= 2) {
      repeatPatients += 1;
      if (p.secondDate) {
        const days =
          (p.secondDate.getTime() - p.firstDate.getTime()) /
          (1000 * 60 * 60 * 24);
        gaps.push(days);
      }
    }
  }

  gaps.sort((a, b) => a - b);
  const medianDaysToSecond =
    gaps.length === 0
      ? null
      : gaps.length % 2 === 1
        ? Math.round(gaps[(gaps.length - 1) / 2])
        : Math.round((gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2);

  // Cohort table — keyed by YYYY-MM of first charging treatment.
  const cohortMap = new Map<
    string,
    { size: number; repeated: number }
  >();
  const monthFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  });
  for (const p of byPatient.values()) {
    // en-CA with year+month yields "YYYY-MM".
    const key = monthFormatter.format(p.firstDate);
    const existing = cohortMap.get(key) ?? { size: 0, repeated: 0 };
    existing.size += 1;
    if (p.chargingCount >= 2) existing.repeated += 1;
    cohortMap.set(key, existing);
  }

  const cohorts: RetentionCohortRow[] = Array.from(cohortMap.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .slice(0, 12) // most recent 12 cohorts
    .map(([month, v]) => ({
      month,
      cohortSize: v.size,
      repeated: v.repeated,
      repeatRate: v.size > 0 ? v.repeated / v.size : 0,
    }));

  // Top patients: top 10 by lifetime revenue.
  const topPatientIds = Array.from(byPatient.entries())
    .sort(([, a], [, b]) => b.lifetimeRevenue - a.lifetimeRevenue)
    .slice(0, 10)
    .map(([id]) => id);
  const topPatientsRaw = await db.patient.findMany({
    where: { id: { in: topPatientIds } },
    select: { id: true, name: true, chartNumber: true },
  });
  const topPatientsById = new Map(topPatientsRaw.map((p) => [p.id, p]));
  const topPatients: TopPatientRow[] = topPatientIds.map((id) => {
    const p = byPatient.get(id)!;
    const meta = topPatientsById.get(id);
    return {
      patientId: id,
      name: meta?.name ?? "（未知）",
      chartNumber: meta?.chartNumber ?? "",
      chargingCount: p.chargingCount,
      lifetimeRevenue: p.lifetimeRevenue,
      firstTreatmentDate: p.firstDate,
      lastTreatmentDate: p.lastDate,
    };
  });

  return {
    totalPayingPatients,
    repeatPatients,
    repeatRate:
      totalPayingPatients > 0 ? repeatPatients / totalPayingPatients : 0,
    averageChargingCountPerPatient:
      totalPayingPatients > 0 ? totalCharging / totalPayingPatients : 0,
    averageLifetimeRevenue:
      totalPayingPatients > 0 ? totalRevenue / totalPayingPatients : 0,
    medianDaysToSecond,
    cohorts,
    topPatients,
  };
}

// ---------------------------------------------------------------
// #9 — Session utilisation
// ---------------------------------------------------------------

export interface SessionUtilisationCell {
  session: AppointmentSession;
  weekday: number; // 0=Sun .. 6=Sat, Taipei local
  count: number;
}

export interface SessionUtilisationStats {
  rangeStart: Date;
  rangeEnd: Date;
  /** Total appointments in the window (all statuses except CANCELLED). */
  total: number;
  perSession: Record<AppointmentSession, number>;
  /** Heatmap: 3 sessions × 7 weekdays. */
  heatmap: SessionUtilisationCell[];
}

export interface SessionUtilisationParams {
  monthsBack: number; // e.g. 3 for a rolling 3-month window
}

export async function getSessionUtilisation({
  monthsBack,
}: SessionUtilisationParams): Promise<SessionUtilisationStats> {
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setMonth(rangeStart.getMonth() - monthsBack);

  const appts = await db.followUpAppointment.findMany({
    where: {
      scheduledAt: { gte: rangeStart, lt: rangeEnd },
      status: { notIn: ["CANCELLED"] },
      patient: { deletedAt: null },
    },
    select: {
      scheduledAt: true,
      session: true,
    },
  });

  const perSession: Record<AppointmentSession, number> = {
    MORNING: 0,
    AFTERNOON: 0,
    EVENING: 0,
  };
  // Build heatmap key: `${session}|${weekday}`.
  const counts = new Map<string, number>();
  // Use Intl to get the Taipei weekday, to avoid TZ drift when the
  // server runs in UTC.
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  });
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  for (const a of appts) {
    perSession[a.session] += 1;
    const label = weekdayFormatter.format(a.scheduledAt);
    const wd = weekdayIndex[label] ?? 0;
    const key = `${a.session}|${wd}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sessions: AppointmentSession[] = ["MORNING", "AFTERNOON", "EVENING"];
  const heatmap: SessionUtilisationCell[] = [];
  for (const s of sessions) {
    for (let w = 0; w <= 6; w++) {
      heatmap.push({
        session: s,
        weekday: w,
        count: counts.get(`${s}|${w}`) ?? 0,
      });
    }
  }

  return {
    rangeStart,
    rangeEnd,
    total: appts.length,
    perSession,
    heatmap,
  };
}

// ---------------------------------------------------------------
// #10 — New patient funnel
// ---------------------------------------------------------------

export interface NewPatientFunnelPoint {
  /** "YYYY-MM" of the first charging treatment. */
  month: string;
  newPatientCount: number;
  /** Of those, how many have a second charging treatment anywhere after. */
  convertedToSecond: number;
  /** convertedToSecond / newPatientCount. */
  conversionRate: number;
  /** Total revenue from those patients' first visit. */
  firstVisitRevenue: number;
  /** Average revenue per first visit. */
  averageFirstVisitRevenue: number;
}

export interface NewPatientFunnelStats {
  monthsBack: number;
  points: NewPatientFunnelPoint[];
  /** Overall conversion rate across all months covered. */
  overallConversionRate: number;
  /** Median days from first to second charging treatment (across all new patients with a second). */
  medianDaysToSecond: number | null;
}

export async function getNewPatientFunnel({
  monthsBack,
}: {
  monthsBack: number;
}): Promise<NewPatientFunnelStats> {
  // Grab all charging treatments; deduce first-ever and second-ever per
  // patient in memory. This is the simplest approach and avoids wrangling
  // window functions in Prisma.
  const charging = await db.treatmentRecord.findMany({
    where: {
      totalAmount: { gt: 0 },
      patient: { deletedAt: null },
    },
    select: {
      patientId: true,
      treatmentDate: true,
      totalAmount: true,
    },
    orderBy: { treatmentDate: "asc" },
  });

  type P = {
    firstDate: Date;
    firstRevenue: number;
    secondDate: Date | null;
  };
  const byPatient = new Map<string, P>();
  for (const t of charging) {
    const existing = byPatient.get(t.patientId);
    if (!existing) {
      byPatient.set(t.patientId, {
        firstDate: t.treatmentDate,
        firstRevenue: t.totalAmount,
        secondDate: null,
      });
    } else if (existing.secondDate == null) {
      existing.secondDate = t.treatmentDate;
    }
  }

  // Build the per-month window.
  const [currentYear, currentMonth] = currentTaipeiYearMonth();
  const windows: Array<{ year: number; month: number; key: string }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    windows.push({
      year: y,
      month: m,
      key: `${y}-${String(m).padStart(2, "0")}`,
    });
  }
  const oldestStart = taipeiMonthWindow(windows[0].year, windows[0].month).start;

  const monthFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  });

  const pointMap = new Map<string, NewPatientFunnelPoint>();
  for (const w of windows) {
    pointMap.set(w.key, {
      month: w.key,
      newPatientCount: 0,
      convertedToSecond: 0,
      conversionRate: 0,
      firstVisitRevenue: 0,
      averageFirstVisitRevenue: 0,
    });
  }

  const gaps: number[] = [];
  let overallNew = 0;
  let overallConverted = 0;
  for (const p of byPatient.values()) {
    if (p.firstDate < oldestStart) continue;
    const key = monthFormatter.format(p.firstDate);
    const point = pointMap.get(key);
    if (!point) continue;
    point.newPatientCount += 1;
    point.firstVisitRevenue += p.firstRevenue;
    overallNew += 1;
    if (p.secondDate) {
      point.convertedToSecond += 1;
      overallConverted += 1;
      const days =
        (p.secondDate.getTime() - p.firstDate.getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(days);
    }
  }
  for (const point of pointMap.values()) {
    point.conversionRate =
      point.newPatientCount > 0
        ? point.convertedToSecond / point.newPatientCount
        : 0;
    point.averageFirstVisitRevenue =
      point.newPatientCount > 0
        ? Math.round(point.firstVisitRevenue / point.newPatientCount)
        : 0;
  }

  gaps.sort((a, b) => a - b);
  const medianDaysToSecond =
    gaps.length === 0
      ? null
      : gaps.length % 2 === 1
        ? Math.round(gaps[(gaps.length - 1) / 2])
        : Math.round((gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2);

  return {
    monthsBack,
    points: windows.map((w) => pointMap.get(w.key)!),
    overallConversionRate: overallNew > 0 ? overallConverted / overallNew : 0,
    medianDaysToSecond,
  };
}
