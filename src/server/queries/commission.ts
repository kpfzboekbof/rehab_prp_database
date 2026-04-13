import { Role, type DoctorCommissionRate, type User } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Look up the commission rate that was active for a given doctor on a given
 * treatment date. Returns 0 (with a `found: false` flag) if no rate is
 * configured — the caller can then decide whether to block the insert or
 * accept a zero commission.
 *
 * This used to live in `queries/treatments.ts` but was moved here so the
 * admin UI and the treatment action share a single source of truth.
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

export type DoctorWithRates = Pick<User, "id" | "name" | "email" | "role" | "active"> & {
  commissionRates: DoctorCommissionRate[];
  currentRate: DoctorCommissionRate | null;
};

/**
 * Everyone who can be the subject of a commission rate (doctors + admins
 * who also practise). STAFF users are excluded since they never own
 * treatment records.
 */
export async function listDoctorsWithRates(): Promise<DoctorWithRates[]> {
  const users = await db.user.findMany({
    where: {
      role: { in: [Role.DOCTOR, Role.ADMIN] },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      commissionRates: {
        orderBy: { effectiveFrom: "desc" },
      },
    },
  });

  return users.map((u) => ({
    ...u,
    currentRate: u.commissionRates.find((r) => r.effectiveTo === null) ?? null,
  }));
}

export async function getDoctorForCommission(doctorId: string) {
  return db.user.findFirst({
    where: {
      id: doctorId,
      role: { in: [Role.DOCTOR, Role.ADMIN] },
    },
    select: { id: true, name: true, email: true, role: true },
  });
}

/**
 * The highest `effectiveFrom` currently stored for a doctor — used by the
 * create action to enforce append-only history (new rates must start after
 * any existing rate).
 */
export async function getLatestRateFor(doctorId: string) {
  return db.doctorCommissionRate.findFirst({
    where: { doctorId },
    orderBy: { effectiveFrom: "desc" },
  });
}
