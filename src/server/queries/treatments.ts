import { db } from "@/lib/db";

export async function listTreatmentsByPatient(patientId: string) {
  return db.treatmentRecord.findMany({
    where: { patientId },
    orderBy: { treatmentDate: "desc" },
    include: {
      product: { select: { id: true, name: true, packageSize: true } },
      doctor: { select: { id: true, name: true } },
    },
  });
}

export async function getTreatment(id: string) {
  return db.treatmentRecord.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unitPrice: true,
          active: true,
          packageSize: true,
        },
      },
      doctor: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, name: true, chartNumber: true } },
    },
  });
}

/**
 * Prepaid package balance for a patient, per package product.
 *
 * Formula (see AGENTS.md for the semantics):
 *   remaining = SUM(quantity) - SUM(vialsUsed)
 * where the sum ranges over all treatments for this patient and product.
 *
 * - For package products, `quantity` is only non-zero on the purchase
 *   visit (it equals `packageSize`). Subsequent use-visits have
 *   `quantity = 0` but `vialsUsed > 0`, which draws down the balance.
 *
 * Regular (non-package) products are excluded — for them `quantity`
 * and `vialsUsed` are always equal, so remaining is always zero and
 * the concept doesn't apply.
 */
export interface PackageBalance {
  productId: string;
  productName: string;
  packageSize: number;
  unitPrice: number;
  totalPurchased: number;
  totalUsed: number;
  remaining: number;
}

export async function getPatientPackageBalances(
  patientId: string,
  /** Optional — if provided, also includes products with zero history so the
   *  treatment form can show "empty balance" state for a just-selected package. */
  includeProductIds: string[] = [],
): Promise<PackageBalance[]> {
  // 1. Aggregate quantity + vialsUsed per product for this patient.
  const agg = await db.treatmentRecord.groupBy({
    by: ["productId"],
    where: { patientId },
    _sum: { quantity: true, vialsUsed: true },
  });

  // 2. Fetch all products we care about:
  //    (a) every product that has any history with this patient, and
  //    (b) any explicitly-requested products (e.g. the one currently
  //        selected in the form, even if the patient has no history yet).
  const productIds = new Set<string>(includeProductIds);
  for (const row of agg) productIds.add(row.productId);

  if (productIds.size === 0) return [];

  const products = await db.pRPProduct.findMany({
    where: { id: { in: [...productIds] } },
    select: { id: true, name: true, packageSize: true, unitPrice: true },
  });

  // 3. Keep only products that ARE packages, and compute balance.
  const balances: PackageBalance[] = [];
  for (const p of products) {
    if (p.packageSize == null) continue;
    const row = agg.find((a) => a.productId === p.id);
    const totalPurchased = row?._sum.quantity ?? 0;
    const totalUsed = row?._sum.vialsUsed ?? 0;
    balances.push({
      productId: p.id,
      productName: p.name,
      packageSize: p.packageSize,
      unitPrice: p.unitPrice,
      totalPurchased,
      totalUsed,
      remaining: totalPurchased - totalUsed,
    });
  }

  // Sort by name for stable display.
  balances.sort((a, b) => a.productName.localeCompare(b.productName));
  return balances;
}
