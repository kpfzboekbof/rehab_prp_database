import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { taipeiDateKey, taipeiDayEnd, taipeiDayStart } from "@/lib/date";
import { appointmentDayForCallDay } from "@/server/queries/reminders";

/**
 * Every scalar the dashboard cards need, in ONE Prisma round-trip.
 *
 * The dashboard used to fire a 9-way `Promise.all` of `count()` /
 * `aggregate()` calls. Parallelism does not save you on Neon: the driver
 * multiplexes them over a pooled connection and each still pays its own
 * ~80-150ms network + planning cost, so the page landed around 1-1.5s
 * before a single card rendered. See the query-budget rule in AGENTS.md.
 *
 * Postgres will happily evaluate all of these as uncorrelated scalar
 * subqueries in a single plan, so the whole thing is one round-trip and
 * the counts stay mutually consistent (same snapshot) as a bonus.
 *
 * NOT included here: the outreach counts, which are genuinely expensive
 * aggregations and live behind their own `unstable_cache` in
 * `src/server/queries/outreach.ts`.
 */
export interface DashboardStats {
  patientCount: number;
  upcomingAppointmentCount: number;
  dueReminderCount: number;
  activeUserCount: number;
  activeProductCount: number;
  doctorsWithCommissionCount: number;
  monthRevenue: number;
  monthCommission: number;
  totalTreatmentRecords: number;
}

interface DashboardStatsRow {
  patient_count: number;
  upcoming_appointments: number;
  due_reminders: number;
  active_users: number;
  active_products: number;
  doctors_with_commission: number;
  month_revenue: bigint | number;
  month_commission: bigint | number;
  total_treatments: number;
}

export interface DashboardStatsParams {
  /** Start of the current Taipei month, as a UTC instant. */
  monthStart: Date;
  /** Start of the next Taipei month, as a UTC instant (exclusive bound). */
  nextMonthStart: Date;
  /**
   * When set, the revenue/commission figures are scoped to this doctor.
   * DOCTORs only see their own numbers; ADMIN sees the clinic total.
   */
  doctorId?: string;
}

export async function getDashboardStats({
  monthStart,
  nextMonthStart,
  doctorId,
}: DashboardStatsParams): Promise<DashboardStats> {
  const now = new Date();

  // Today's reminder list = appointments landing on (today + REMINDER_LEAD_DAYS)
  // in Taipei, not yet called and not cancelled. Same predicate as
  // `countDueRemindersToday()`, expressed inline so it joins the single query.
  const apptDayKey = appointmentDayForCallDay(taipeiDateKey(now));
  const reminderWindowStart = taipeiDayStart(apptDayKey);
  const reminderWindowEnd = taipeiDayEnd(apptDayKey);

  // Optional doctor scope, injected into both money subqueries. The
  // `1 = 1` guard makes the bare `AND` legal when the filter is empty.
  const doctorWhere = doctorId
    ? Prisma.sql`AND "doctorId" = ${doctorId}`
    : Prisma.empty;

  const [row] = await db.$queryRaw<DashboardStatsRow[]>(Prisma.sql`
    SELECT
      (SELECT COUNT(*) FROM "Patient" WHERE "deletedAt" IS NULL)::int
        AS patient_count,

      (SELECT COUNT(*) FROM "FollowUpAppointment"
        WHERE "scheduledAt" >= ${now}
          AND "status" <> 'CANCELLED'::"AppointmentStatus")::int
        AS upcoming_appointments,

      (SELECT COUNT(*) FROM "FollowUpAppointment" a
        WHERE a."scheduledAt" >= ${reminderWindowStart}
          AND a."scheduledAt" <  ${reminderWindowEnd}
          AND a."status" <> 'CANCELLED'::"AppointmentStatus"
          AND NOT EXISTS (
            SELECT 1 FROM "FollowUpCall" c WHERE c."appointmentId" = a."id"
          ))::int
        AS due_reminders,

      (SELECT COUNT(*) FROM "User" WHERE "active")::int
        AS active_users,

      (SELECT COUNT(*) FROM "PRPProduct" WHERE "active")::int
        AS active_products,

      (SELECT COUNT(*) FROM "DoctorCommissionRate" WHERE "effectiveTo" IS NULL)::int
        AS doctors_with_commission,

      (SELECT COALESCE(SUM("totalAmount"), 0) FROM "TreatmentRecord"
        WHERE 1 = 1
          AND "treatmentDate" >= ${monthStart}
          AND "treatmentDate" <  ${nextMonthStart}
          ${doctorWhere})::bigint
        AS month_revenue,

      (SELECT COALESCE(SUM("commissionAmount"), 0) FROM "TreatmentRecord"
        WHERE 1 = 1
          AND "treatmentDate" >= ${monthStart}
          AND "treatmentDate" <  ${nextMonthStart}
          ${doctorWhere})::bigint
        AS month_commission,

      (SELECT COUNT(*) FROM "TreatmentRecord")::int
        AS total_treatments
  `);

  return {
    patientCount: row?.patient_count ?? 0,
    upcomingAppointmentCount: row?.upcoming_appointments ?? 0,
    dueReminderCount: row?.due_reminders ?? 0,
    activeUserCount: row?.active_users ?? 0,
    activeProductCount: row?.active_products ?? 0,
    doctorsWithCommissionCount: row?.doctors_with_commission ?? 0,
    monthRevenue: row ? Number(row.month_revenue) : 0,
    monthCommission: row ? Number(row.month_commission) : 0,
    totalTreatmentRecords: row?.total_treatments ?? 0,
  };
}
