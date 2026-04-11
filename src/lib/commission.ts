/**
 * Commission math helper.
 *
 * The result of this function is **snapshotted** onto TreatmentRecord at
 * the moment the record is created. Re-running this function against a
 * record later may yield a different number if the product price or the
 * doctor's rate has changed — that is by design, and why we freeze it.
 *
 * All monetary values are integer TWD (no fractional cents).
 */
export function computeCommission(totalAmount: number, rate: number): number {
  if (!Number.isFinite(totalAmount) || !Number.isFinite(rate)) return 0;
  return Math.round(totalAmount * rate);
}
