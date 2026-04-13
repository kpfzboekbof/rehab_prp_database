import { db } from "@/lib/db";

/**
 * Admin list: every product, including inactive, with a count of how many
 * treatment records reference it. Used by /admin/products.
 */
export async function listProducts() {
  return db.pRPProduct.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { treatments: true } },
    },
  });
}

/**
 * Shortlist used by the treatment-record form dropdown. Hides inactive
 * products so doctors can't accidentally book new treatments against a
 * retired product.
 */
export async function listActiveProducts() {
  return db.pRPProduct.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unitPrice: true },
  });
}

export async function getProduct(id: string) {
  return db.pRPProduct.findUnique({
    where: { id },
    include: { _count: { select: { treatments: true } } },
  });
}
