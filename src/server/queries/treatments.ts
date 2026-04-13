import { db } from "@/lib/db";

export async function listTreatmentsByPatient(patientId: string) {
  return db.treatmentRecord.findMany({
    where: { patientId },
    orderBy: { treatmentDate: "desc" },
    include: {
      product: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true } },
    },
  });
}

export async function getTreatment(id: string) {
  return db.treatmentRecord.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, unitPrice: true, active: true } },
      doctor: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, name: true, chartNumber: true } },
    },
  });
}

/**
 * Active PRP products for the treatment form dropdown. Inactive products are
 * hidden from new entries but still referenced by existing records.
 */
export async function listActiveProducts() {
  return db.pRPProduct.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unitPrice: true },
  });
}

/**
 * Look up the commission rate that was active for a given doctor on a given
 * treatment date. Returns 0 (with a `found: false` flag) if no rate is
 * configured — the caller can then decide whether to block the insert or
 * accept a zero commission.
 */
export async function getEffectiveCommissionRate(
  doctorId: string,
  onDate: Date,
): Promise<{ rate: number; found: boolean }> {
  const row = await db.doctorCommissionRate.findFirst({
    where: {
      doctorId,
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: onDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
    select: { rate: true },
  });
  if (!row) return { rate: 0, found: false };
  return { rate: row.rate, found: true };
}
