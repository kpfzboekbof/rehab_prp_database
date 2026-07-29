import { Prisma } from "@prisma/client";
import type {
  AppointmentStatus,
  BodyPart,
  Gender,
  OutreachContact,
  OutreachReason,
  User,
} from "@prisma/client";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

/**
 * Outreach / marketing action lists. Each list answers a different
 * question about "who should we call next to promote PRP?" — dormant,
 * package-finished, no-show. Each returns a flat array of patients
 * with context rows + their most recent outreach-contact log for that
 * reason (if any), so the UI can mark already-called patients.
 *
 * PERFORMANCE (see the query-budget rule in AGENTS.md)
 * ---------------------------------------------------
 * All three lists are single raw-SQL round-trips that return exactly
 * the rows the page renders. The previous Prisma implementations were
 * the two failure modes AGENTS.md warns about:
 *
 *   - `listDormantPatients` used a nested `include` to pull EVERY
 *     treatment row of EVERY dormant patient across the wire, just to
 *     reduce them in JS to a count, a SUM and a "most recent".
 *   - `listPackageFinishedPatients` was a `groupBy` followed by two
 *     more `findMany` calls (3 round-trips), and the groupBy scanned
 *     every package treatment ever recorded.
 *   - `listNoShowPatients` fetched ALL historical NO_SHOW/CANCELLED
 *     appointments with a nested patient+contact include, deduped in
 *     JS, then issued a second query to filter them again.
 *
 * Postgres now does the aggregation, the "latest row per group" (via
 * DISTINCT ON / LATERAL) and the filtering in a single plan.
 *
 * These three are deliberately NOT wrapped in `unstable_cache`: it
 * JSON-serializes its payload, which would turn the `Date` fields
 * below into strings on a cache hit. `countOutreachLists` at the
 * bottom caches only three integers, which are JSON-safe.
 */

export interface OutreachContactWithUser extends OutreachContact {
  contactedBy: Pick<User, "id" | "name">;
}

export interface OutreachPatientSummary {
  id: string;
  name: string;
  chartNumber: string;
  phone: string | null;
  gender: Gender;
  birthDate: Date;
  /** Most recent outreach contact for this reason, if any. */
  recentContact: OutreachContactWithUser | null;
}

/**
 * Columns every list selects for the embedded "most recent contact for
 * this reason" row. Kept in one place so the three queries stay in sync
 * with `buildRecentContact` below.
 */
const RECENT_CONTACT_COLUMNS = Prisma.sql`
  oc."id"            AS contact_id,
  oc."patientId"     AS contact_patient_id,
  oc."reason"        AS contact_reason,
  oc."contactedAt"   AS contact_contacted_at,
  oc."contactedById" AS contact_contacted_by_id,
  oc."outcome"       AS contact_outcome,
  oc."notes"         AS contact_notes,
  oc."createdAt"     AS contact_created_at,
  cu."name"          AS contact_contacted_by_name
`;

/**
 * `LEFT JOIN LATERAL` pulling the single most recent OutreachContact for
 * a given reason. `patientCol` is the SQL expression naming the patient
 * id in the enclosing query.
 */
function recentContactJoin(patientCol: Prisma.Sql, reason: OutreachReason) {
  return Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT c.*
      FROM "OutreachContact" c
      WHERE c."patientId" = ${patientCol}
        AND c."reason" = ${reason}::"OutreachReason"
      ORDER BY c."contactedAt" DESC
      LIMIT 1
    ) oc ON TRUE
    LEFT JOIN "User" cu ON cu."id" = oc."contactedById"
  `;
}

/** Shared shape of the recent-contact columns coming back from SQL. */
interface RecentContactRaw {
  contact_id: string | null;
  contact_patient_id: string | null;
  contact_reason: OutreachReason | null;
  contact_contacted_at: Date | null;
  contact_contacted_by_id: string | null;
  contact_outcome: string | null;
  contact_notes: string | null;
  contact_created_at: Date | null;
  contact_contacted_by_name: string | null;
}

function buildRecentContact(
  row: RecentContactRaw,
): OutreachContactWithUser | null {
  if (
    row.contact_id == null ||
    row.contact_patient_id == null ||
    row.contact_reason == null ||
    row.contact_contacted_at == null ||
    row.contact_contacted_by_id == null ||
    row.contact_created_at == null
  ) {
    return null;
  }
  return {
    id: row.contact_id,
    patientId: row.contact_patient_id,
    reason: row.contact_reason,
    contactedAt: row.contact_contacted_at,
    contactedById: row.contact_contacted_by_id,
    outcome: row.contact_outcome,
    notes: row.contact_notes,
    createdAt: row.contact_created_at,
    contactedBy: {
      id: row.contact_contacted_by_id,
      name: row.contact_contacted_by_name ?? "（未知）",
    },
  };
}

/** Whole days between `then` and `now`, floored — matches the old JS math. */
function daysBetween(now: Date, then: Date): number {
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

// --- Dormant ---

export interface DormantRow {
  patient: OutreachPatientSummary;
  /** Most recent treatment date (the one we're saying is "too long ago"). */
  lastTreatmentDate: Date;
  lastBodyPart: BodyPart;
  lastProductName: string;
  lastAmount: number;
  /** Integer days since last treatment. */
  daysSince: number;
  /** Total lifetime treatments count (for context). */
  treatmentCount: number;
  /** Total lifetime revenue. */
  lifetimeRevenue: number;
}

interface DormantRaw extends RecentContactRaw {
  id: string;
  name: string;
  chart_number: string;
  phone: string | null;
  gender: Gender;
  birth_date: Date;
  treatment_count: number;
  lifetime_revenue: bigint | number;
  last_treatment_date: Date;
  last_body_part: BodyPart;
  last_product_name: string | null;
  last_amount: number;
}

/**
 * Patients whose most recent treatment is older than `monthsThreshold`
 * months AND who have no upcoming (non-cancelled) appointment.
 *
 * Deleted patients excluded. Patients with no treatments at all are
 * excluded (they were never active PRP patients to begin with) — the
 * `GROUP BY` over TreatmentRecord enforces that implicitly, which is
 * the SQL equivalent of the old `treatments: { some: {} }` guard.
 */
export async function listDormantPatients(
  monthsThreshold: number,
): Promise<DormantRow[]> {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - monthsThreshold);

  const rows = await db.$queryRaw<DormantRaw[]>(Prisma.sql`
    WITH dormant AS (
      SELECT
        tr."patientId"                              AS patient_id,
        COUNT(*)::int                               AS treatment_count,
        COALESCE(SUM(tr."totalAmount"), 0)::bigint  AS lifetime_revenue,
        MAX(tr."treatmentDate")                     AS last_treatment_date
      FROM "TreatmentRecord" tr
      JOIN "Patient" p ON p."id" = tr."patientId"
      WHERE p."deletedAt" IS NULL
      GROUP BY tr."patientId"
      -- "every treatment is before the threshold" == "the latest one is"
      HAVING MAX(tr."treatmentDate") < ${threshold}
    )
    SELECT
      p."id",
      p."name",
      p."chartNumber"  AS chart_number,
      p."phone",
      p."gender",
      p."birthDate"    AS birth_date,
      d.treatment_count,
      d.lifetime_revenue,
      d.last_treatment_date,
      lt."bodyPart"    AS last_body_part,
      prod."name"      AS last_product_name,
      lt."totalAmount" AS last_amount,
      ${RECENT_CONTACT_COLUMNS}
    FROM dormant d
    JOIN "Patient" p ON p."id" = d.patient_id
    -- The single most recent treatment, for the "last visit" context line.
    CROSS JOIN LATERAL (
      SELECT tr."bodyPart", tr."totalAmount", tr."productId"
      FROM "TreatmentRecord" tr
      WHERE tr."patientId" = d.patient_id
      ORDER BY tr."treatmentDate" DESC
      LIMIT 1
    ) lt
    LEFT JOIN "PRPProduct" prod ON prod."id" = lt."productId"
    ${recentContactJoin(Prisma.sql`d.patient_id`, "DORMANT")}
    WHERE NOT EXISTS (
      SELECT 1 FROM "FollowUpAppointment" a
      WHERE a."patientId" = d.patient_id
        AND a."scheduledAt" >= ${now}
        AND a."status" <> 'CANCELLED'::"AppointmentStatus"
    )
    ORDER BY d.lifetime_revenue DESC
  `);

  return rows.map((r) => ({
    patient: {
      id: r.id,
      name: r.name,
      chartNumber: r.chart_number,
      phone: r.phone,
      gender: r.gender,
      birthDate: r.birth_date,
      recentContact: buildRecentContact(r),
    },
    lastTreatmentDate: r.last_treatment_date,
    lastBodyPart: r.last_body_part,
    lastProductName: r.last_product_name ?? "（未知品項）",
    lastAmount: r.last_amount,
    daysSince: daysBetween(now, r.last_treatment_date),
    treatmentCount: r.treatment_count,
    lifetimeRevenue: Number(r.lifetime_revenue),
  }));
}

// --- Package finished ---

export interface PackageFinishedRow {
  patient: OutreachPatientSummary;
  productId: string;
  productName: string;
  packageSize: number;
  unitPriceSnapshotLatest: number;
  purchasedTotal: number;
  usedTotal: number;
  lastUsedAt: Date;
  daysSince: number;
}

interface PackageFinishedRaw extends RecentContactRaw {
  id: string;
  name: string;
  chart_number: string;
  phone: string | null;
  gender: Gender;
  birth_date: Date;
  product_id: string;
  product_name: string;
  package_size: number;
  unit_price: number;
  purchased_total: number;
  used_total: number;
  last_used_at: Date;
}

/**
 * Patients who bought a prepaid package product and have exhausted
 * their balance (remaining = 0), and their most recent use was at
 * least `daysSinceUseThreshold` days ago. One row per (patient, product)
 * — a patient can show up multiple times if they finished multiple
 * different package products.
 *
 * Soft-deleted patients are excluded inside the aggregation itself. The
 * old implementation filtered them only in a follow-up `findMany`, so
 * deleted patients were aggregated and then silently dropped.
 */
export async function listPackageFinishedPatients(
  daysSinceUseThreshold: number,
): Promise<PackageFinishedRow[]> {
  const now = new Date();
  const threshold = new Date(
    now.getTime() - daysSinceUseThreshold * 24 * 60 * 60 * 1000,
  );

  const rows = await db.$queryRaw<PackageFinishedRaw[]>(Prisma.sql`
    WITH pkg AS (
      SELECT
        tr."patientId"           AS patient_id,
        tr."productId"           AS product_id,
        SUM(tr."quantity")::int  AS purchased_total,
        SUM(tr."vialsUsed")::int AS used_total,
        MAX(tr."treatmentDate")  AS last_used_at
      FROM "TreatmentRecord" tr
      JOIN "PRPProduct" prod ON prod."id" = tr."productId"
      JOIN "Patient"    p    ON p."id"    = tr."patientId"
      WHERE prod."packageSize" IS NOT NULL
        AND p."deletedAt" IS NULL
      GROUP BY tr."patientId", tr."productId"
      HAVING SUM(tr."quantity") > 0
         AND SUM(tr."quantity") = SUM(tr."vialsUsed")
         AND MAX(tr."treatmentDate") < ${threshold}
    )
    SELECT
      p."id",
      p."name",
      p."chartNumber"    AS chart_number,
      p."phone",
      p."gender",
      p."birthDate"      AS birth_date,
      prod."id"          AS product_id,
      prod."name"        AS product_name,
      prod."packageSize" AS package_size,
      prod."unitPrice"   AS unit_price,
      pkg.purchased_total,
      pkg.used_total,
      pkg.last_used_at,
      ${RECENT_CONTACT_COLUMNS}
    FROM pkg
    JOIN "Patient"    p    ON p."id"    = pkg.patient_id
    JOIN "PRPProduct" prod ON prod."id" = pkg.product_id
    ${recentContactJoin(Prisma.sql`pkg.patient_id`, "PACKAGE_FINISHED")}
    -- daysSince ASC == most recently finished first
    ORDER BY pkg.last_used_at DESC
  `);

  return rows.map((r) => ({
    patient: {
      id: r.id,
      name: r.name,
      chartNumber: r.chart_number,
      phone: r.phone,
      gender: r.gender,
      birthDate: r.birth_date,
      recentContact: buildRecentContact(r),
    },
    productId: r.product_id,
    productName: r.product_name,
    packageSize: r.package_size,
    unitPriceSnapshotLatest: r.unit_price,
    purchasedTotal: r.purchased_total,
    usedTotal: r.used_total,
    lastUsedAt: r.last_used_at,
    daysSince: daysBetween(now, r.last_used_at),
  }));
}

// --- No-show / cancelled ---

export interface NoShowRow {
  patient: OutreachPatientSummary;
  appointmentId: string;
  scheduledAt: Date;
  session: "MORNING" | "AFTERNOON" | "EVENING";
  status: AppointmentStatus;
  reason: string | null;
  daysSince: number;
}

interface NoShowRaw extends RecentContactRaw {
  id: string;
  name: string;
  chart_number: string;
  phone: string | null;
  gender: Gender;
  birth_date: Date;
  appointment_id: string;
  scheduled_at: Date;
  session: "MORNING" | "AFTERNOON" | "EVENING";
  status: AppointmentStatus;
  reason: string | null;
}

/**
 * Most recent NO_SHOW / CANCELLED appointment per patient, for patients
 * who have no later non-cancelled appointment on file.
 *
 * `DISTINCT ON (patientId) ... ORDER BY patientId, scheduledAt DESC` is
 * the Postgres idiom for "latest row per group" and replaces the old
 * fetch-everything-then-dedupe-in-JS pass.
 */
export async function listNoShowPatients(): Promise<NoShowRow[]> {
  const now = new Date();

  const rows = await db.$queryRaw<NoShowRaw[]>(Prisma.sql`
    WITH latest_problem AS (
      SELECT DISTINCT ON (a."patientId")
        a."id"          AS appointment_id,
        a."patientId"   AS patient_id,
        a."scheduledAt" AS scheduled_at,
        a."session",
        a."status",
        a."reason"
      FROM "FollowUpAppointment" a
      JOIN "Patient" p ON p."id" = a."patientId"
      WHERE a."status" IN (
              'NO_SHOW'::"AppointmentStatus",
              'CANCELLED'::"AppointmentStatus"
            )
        AND a."scheduledAt" < ${now}
        AND p."deletedAt" IS NULL
      ORDER BY a."patientId", a."scheduledAt" DESC
    )
    SELECT
      p."id",
      p."name",
      p."chartNumber" AS chart_number,
      p."phone",
      p."gender",
      p."birthDate"   AS birth_date,
      lp.appointment_id,
      lp.scheduled_at,
      lp."session",
      lp."status",
      lp."reason",
      ${RECENT_CONTACT_COLUMNS}
    FROM latest_problem lp
    JOIN "Patient" p ON p."id" = lp.patient_id
    ${recentContactJoin(Prisma.sql`lp.patient_id`, "NO_SHOW")}
    WHERE NOT EXISTS (
      SELECT 1 FROM "FollowUpAppointment" f
      WHERE f."patientId" = lp.patient_id
        AND f."scheduledAt" >= ${now}
        AND f."status" <> 'CANCELLED'::"AppointmentStatus"
    )
    -- daysSince ASC == most recent no-show first
    ORDER BY lp.scheduled_at DESC
  `);

  return rows.map((r) => ({
    patient: {
      id: r.id,
      name: r.name,
      chartNumber: r.chart_number,
      phone: r.phone,
      gender: r.gender,
      birthDate: r.birth_date,
      recentContact: buildRecentContact(r),
    },
    appointmentId: r.appointment_id,
    scheduledAt: r.scheduled_at,
    session: r.session,
    status: r.status,
    reason: r.reason,
    daysSince: daysBetween(now, r.scheduled_at),
  }));
}

// --- Counts for dashboard ---

export interface OutreachCounts {
  dormant: number;
  packageFinished: number;
  noShow: number;
}

/**
 * Uncached implementation of the dashboard counts. Prefer the cached
 * `countOutreachLists` below in page code; this is exported so it can be
 * exercised directly outside a Next.js request context (where
 * `unstable_cache` has no incremental cache to talk to).
 *
 * This deliberately does NOT reuse the three list functions above: the
 * dashboard card needs three integers, not three arrays of patient rows.
 * Counting in Postgres over the same CTEs keeps the payload at one row
 * of three numbers no matter how long the lists get.
 *
 * Thresholds are the list defaults: 3 months dormant, 30 days since a
 * package was finished.
 */
export async function computeOutreachCounts(): Promise<OutreachCounts> {
  const now = new Date();

  const dormantThreshold = new Date(now);
  dormantThreshold.setMonth(dormantThreshold.getMonth() - 3);

  const packageThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [row] = await db.$queryRaw<
    Array<{ dormant: number; package_finished: number; no_show: number }>
  >(Prisma.sql`
    WITH dormant AS (
      SELECT tr."patientId" AS patient_id
      FROM "TreatmentRecord" tr
      JOIN "Patient" p ON p."id" = tr."patientId"
      WHERE p."deletedAt" IS NULL
      GROUP BY tr."patientId"
      HAVING MAX(tr."treatmentDate") < ${dormantThreshold}
    ),
    pkg AS (
      SELECT tr."patientId" AS patient_id, tr."productId" AS product_id
      FROM "TreatmentRecord" tr
      JOIN "PRPProduct" prod ON prod."id" = tr."productId"
      JOIN "Patient"    p    ON p."id"    = tr."patientId"
      WHERE prod."packageSize" IS NOT NULL
        AND p."deletedAt" IS NULL
      GROUP BY tr."patientId", tr."productId"
      HAVING SUM(tr."quantity") > 0
         AND SUM(tr."quantity") = SUM(tr."vialsUsed")
         AND MAX(tr."treatmentDate") < ${packageThreshold}
    ),
    latest_problem AS (
      SELECT DISTINCT ON (a."patientId") a."patientId" AS patient_id
      FROM "FollowUpAppointment" a
      JOIN "Patient" p ON p."id" = a."patientId"
      WHERE a."status" IN (
              'NO_SHOW'::"AppointmentStatus",
              'CANCELLED'::"AppointmentStatus"
            )
        AND a."scheduledAt" < ${now}
        AND p."deletedAt" IS NULL
      ORDER BY a."patientId", a."scheduledAt" DESC
    )
    SELECT
      (SELECT COUNT(*) FROM dormant d
        WHERE NOT EXISTS (
          SELECT 1 FROM "FollowUpAppointment" a
          WHERE a."patientId" = d.patient_id
            AND a."scheduledAt" >= ${now}
            AND a."status" <> 'CANCELLED'::"AppointmentStatus"
        ))::int AS dormant,
      (SELECT COUNT(*) FROM pkg)::int AS package_finished,
      (SELECT COUNT(*) FROM latest_problem lp
        WHERE NOT EXISTS (
          SELECT 1 FROM "FollowUpAppointment" f
          WHERE f."patientId" = lp.patient_id
            AND f."scheduledAt" >= ${now}
            AND f."status" <> 'CANCELLED'::"AppointmentStatus"
        ))::int AS no_show
  `);

  return {
    dormant: row?.dormant ?? 0,
    packageFinished: row?.package_finished ?? 0,
    noShow: row?.no_show ?? 0,
  };
}

/**
 * Cached counts used by the dashboard cards and the /analytics hub.
 *
 * Cached for 5 minutes because the underlying data changes on the order
 * of days — a slightly stale count is harmless. Safe to cache: the
 * payload is three integers, so `unstable_cache`'s JSON round-trip
 * cannot mangle it.
 *
 * Tagged `outreach-counts`; `src/server/actions/outreach.ts` calls
 * `updateTag("outreach-counts")` after logging a contact so the card
 * reflects the change immediately instead of waiting out the TTL.
 */
export const countOutreachLists = unstable_cache(
  computeOutreachCounts,
  ["outreach-counts-v2"],
  {
    revalidate: 300, // 5 minutes
    tags: ["outreach-counts"],
  },
);

export type OutreachReasonKey = OutreachReason;
