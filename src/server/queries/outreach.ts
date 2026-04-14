import type {
  AppointmentStatus,
  BodyPart,
  Gender,
  OutreachContact,
  OutreachReason,
  User,
} from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Outreach / marketing action lists. Each list answers a different
 * question about "who should we call next to promote PRP?" — dormant,
 * package-finished, no-show. Each returns a flat array of patients
 * with context rows + their most recent outreach-contact log for that
 * reason (if any), so the UI can mark already-called patients.
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

/**
 * Patients whose most recent treatment is older than `monthsThreshold`
 * months AND who have no upcoming (non-cancelled) appointment.
 *
 * Deleted patients excluded. Patients with no treatments at all are
 * excluded (they were never active PRP patients to begin with).
 */
export async function listDormantPatients(
  monthsThreshold: number,
): Promise<DormantRow[]> {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - monthsThreshold);

  const patients = await db.patient.findMany({
    where: {
      deletedAt: null,
      // Has at least one treatment...
      treatments: { some: {} },
      // ...and *every* treatment is before the threshold
      // (equivalent to "max treatment date is before threshold").
      AND: [
        {
          treatments: {
            every: { treatmentDate: { lt: threshold } },
          },
        },
        // No upcoming appointment that is not cancelled.
        {
          appointments: {
            none: {
              scheduledAt: { gte: now },
              status: { notIn: ["CANCELLED"] },
            },
          },
        },
      ],
    },
    include: {
      treatments: {
        orderBy: { treatmentDate: "desc" },
        select: {
          treatmentDate: true,
          bodyPart: true,
          totalAmount: true,
          product: { select: { name: true } },
        },
      },
      outreachContacts: {
        where: { reason: "DORMANT" },
        orderBy: { contactedAt: "desc" },
        take: 1,
        include: {
          contactedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  return patients
    .filter((p) => p.treatments.length > 0)
    .map((p) => {
      const last = p.treatments[0];
      const daysSince = Math.floor(
        (now.getTime() - last.treatmentDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const lifetimeRevenue = p.treatments.reduce(
        (sum, t) => sum + t.totalAmount,
        0,
      );
      return {
        patient: {
          id: p.id,
          name: p.name,
          chartNumber: p.chartNumber,
          phone: p.phone,
          gender: p.gender,
          birthDate: p.birthDate,
          recentContact: p.outreachContacts[0] ?? null,
        },
        lastTreatmentDate: last.treatmentDate,
        lastBodyPart: last.bodyPart,
        lastProductName: last.product.name,
        lastAmount: last.totalAmount,
        daysSince,
        treatmentCount: p.treatments.length,
        lifetimeRevenue,
      };
    })
    .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
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

/**
 * Patients who bought a prepaid package product and have exhausted
 * their balance (remaining = 0), and their most recent use was at
 * least `daysSinceUseThreshold` days ago. One row per (patient, product)
 * — a patient can show up multiple times if they finished multiple
 * different package products.
 */
export async function listPackageFinishedPatients(
  daysSinceUseThreshold: number,
): Promise<PackageFinishedRow[]> {
  const now = new Date();
  const threshold = new Date(
    now.getTime() - daysSinceUseThreshold * 24 * 60 * 60 * 1000,
  );

  // Aggregate per (patientId, productId) — package products only.
  const agg = await db.treatmentRecord.groupBy({
    by: ["patientId", "productId"],
    where: {
      patient: { deletedAt: null },
      product: { packageSize: { not: null } },
    },
    _sum: { quantity: true, vialsUsed: true },
    _max: { treatmentDate: true },
  });

  const finished = agg.filter((row) => {
    const purchased = row._sum.quantity ?? 0;
    const used = row._sum.vialsUsed ?? 0;
    return (
      purchased > 0 &&
      purchased === used &&
      row._max.treatmentDate != null &&
      row._max.treatmentDate < threshold
    );
  });

  if (finished.length === 0) return [];

  const patientIds = Array.from(new Set(finished.map((r) => r.patientId)));
  const productIds = Array.from(new Set(finished.map((r) => r.productId)));

  const [patients, products] = await Promise.all([
    db.patient.findMany({
      where: { id: { in: patientIds }, deletedAt: null },
      include: {
        outreachContacts: {
          where: { reason: "PACKAGE_FINISHED" },
          orderBy: { contactedAt: "desc" },
          take: 1,
          include: { contactedBy: { select: { id: true, name: true } } },
        },
      },
    }),
    db.pRPProduct.findMany({
      where: { id: { in: productIds } },
    }),
  ]);

  const patientsById = new Map(patients.map((p) => [p.id, p]));
  const productsById = new Map(products.map((p) => [p.id, p]));

  const rows: PackageFinishedRow[] = [];
  for (const row of finished) {
    const patient = patientsById.get(row.patientId);
    const product = productsById.get(row.productId);
    if (!patient || !product || product.packageSize == null) continue;
    const lastUsedAt = row._max.treatmentDate;
    if (lastUsedAt == null) continue;
    rows.push({
      patient: {
        id: patient.id,
        name: patient.name,
        chartNumber: patient.chartNumber,
        phone: patient.phone,
        gender: patient.gender,
        birthDate: patient.birthDate,
        recentContact: patient.outreachContacts[0] ?? null,
      },
      productId: product.id,
      productName: product.name,
      packageSize: product.packageSize,
      unitPriceSnapshotLatest: product.unitPrice,
      purchasedTotal: row._sum.quantity ?? 0,
      usedTotal: row._sum.vialsUsed ?? 0,
      lastUsedAt,
      daysSince: Math.floor(
        (now.getTime() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    });
  }
  return rows.sort((a, b) => a.daysSince - b.daysSince);
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

/**
 * Most recent NO_SHOW / CANCELLED appointment per patient, for patients
 * who have no later non-cancelled appointment on file.
 */
export async function listNoShowPatients(): Promise<NoShowRow[]> {
  const now = new Date();

  const problem = await db.followUpAppointment.findMany({
    where: {
      status: { in: ["NO_SHOW", "CANCELLED"] },
      patient: { deletedAt: null },
      scheduledAt: { lt: now },
    },
    include: {
      patient: {
        include: {
          outreachContacts: {
            where: { reason: "NO_SHOW" },
            orderBy: { contactedAt: "desc" },
            take: 1,
            include: { contactedBy: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Group: keep only the most recent (first after the desc sort) per patient.
  const byPatient = new Map<string, (typeof problem)[number]>();
  for (const a of problem) {
    if (!byPatient.has(a.patientId)) {
      byPatient.set(a.patientId, a);
    }
  }

  if (byPatient.size === 0) return [];

  // Filter out patients who have any later non-cancelled appointment.
  const patientIds = Array.from(byPatient.keys());
  const futureApts = await db.followUpAppointment.findMany({
    where: {
      patientId: { in: patientIds },
      scheduledAt: { gte: now },
      status: { notIn: ["CANCELLED"] },
    },
    select: { patientId: true },
    distinct: ["patientId"],
  });
  const patientsWithFuture = new Set(futureApts.map((a) => a.patientId));

  return Array.from(byPatient.values())
    .filter((a) => !patientsWithFuture.has(a.patientId))
    .map((a) => ({
      patient: {
        id: a.patient.id,
        name: a.patient.name,
        chartNumber: a.patient.chartNumber,
        phone: a.patient.phone,
        gender: a.patient.gender,
        birthDate: a.patient.birthDate,
        recentContact: a.patient.outreachContacts[0] ?? null,
      },
      appointmentId: a.id,
      scheduledAt: a.scheduledAt,
      session: a.session,
      status: a.status,
      reason: a.reason,
      daysSince: Math.floor(
        (now.getTime() - a.scheduledAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }))
    .sort((a, b) => a.daysSince - b.daysSince);
}

// --- Counts for dashboard ---

export interface OutreachCounts {
  dormant: number;
  packageFinished: number;
  noShow: number;
}

/**
 * Lightweight counts used by the dashboard cards. Uses default thresholds
 * (3 months for dormant, 30 days for package finished).
 */
export async function countOutreachLists(): Promise<OutreachCounts> {
  const [dormant, packageFinished, noShow] = await Promise.all([
    listDormantPatients(3).then((r) => r.length),
    listPackageFinishedPatients(30).then((r) => r.length),
    listNoShowPatients().then((r) => r.length),
  ]);
  return { dormant, packageFinished, noShow };
}

export type OutreachReasonKey = OutreachReason;
