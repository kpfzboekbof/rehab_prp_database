"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { computeCommission } from "@/lib/commission";
import { taipeiDayStart } from "@/lib/date";
import { treatmentInputSchema } from "@/lib/validation/treatment";
import { getEffectiveCommissionRate } from "@/server/queries/commission";
import { requireRole } from "@/server/rbac";

/**
 * Snapshot semantics (IMPORTANT — see AGENTS.md):
 *
 * On create AND on update, we freeze:
 *   - unitPriceSnapshot      ← product.unitPrice at the time of save
 *   - totalAmount            ← see below; depends on product type
 *   - commissionRateSnapshot ← doctor's effective rate on treatmentDate
 *   - commissionAmount       ← totalAmount * rate (rounded to integer TWD)
 *
 * `unitPrice` has dual meaning depending on whether the product is a
 * package (see PRPProduct schema comment):
 *   - Regular product: per-vial price.
 *   - Package product: TOTAL package price (the whole set is paid once
 *     upfront). Average per-vial is shown as a UI hint.
 *
 * "Billed quantity" + totalAmount depend on product type:
 *   - Regular product:
 *       billedQuantity = vialsUsed
 *       totalAmount    = vialsUsed × unitPriceSnapshot  (per-vial × vials)
 *   - Package product, mode = PURCHASE:
 *       billedQuantity = product.packageSize  (kept for balance accounting)
 *       totalAmount    = unitPriceSnapshot    (the WHOLE package price;
 *                                              NOT multiplied by packageSize)
 *       vialsUsed      = vials actually injected on the purchase visit.
 *   - Package product, mode = USE:
 *       billedQuantity = 0 (no new charge)
 *       totalAmount    = 0
 *       vialsUsed      = vials injected this visit (deducts balance).
 *
 * Snapshots are NEVER recomputed from source tables after the record exists,
 * so monthly revenue / commission reports are a pure aggregation over
 * immutable rows. Edits re-snapshot on purpose: if you edit to fix a typo
 * the total and commission update to match.
 */

export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readInput(formData: FormData) {
  return {
    treatmentDate: formData.get("treatmentDate")?.toString() ?? "",
    bodyPart: formData.get("bodyPart")?.toString() ?? "",
    bodyPartDetail: formData.get("bodyPartDetail")?.toString() ?? "",
    symptoms: formData.get("symptoms")?.toString() ?? "",
    painBefore: formData.get("painBefore")?.toString() ?? "",
    productId: formData.get("productId")?.toString() ?? "",
    vialsUsed: formData.get("vialsUsed")?.toString() ?? "",
    packageMode: (formData.get("packageMode")?.toString() || undefined) as
      | "USE"
      | "PURCHASE"
      | undefined,
    ultrasoundNote: formData.get("ultrasoundNote")?.toString() ?? "",
    physicianNote: formData.get("physicianNote")?.toString() ?? "",
  };
}

interface ResolvedAmounts {
  billedQuantity: number;
  vialsUsed: number;
  unitPriceSnapshot: number;
  totalAmount: number;
  commissionRateSnapshot: number;
  commissionAmount: number;
}

/**
 * Resolves a TreatmentRecord's billing fields based on product type and
 * package mode, looks up the doctor's effective commission rate, and
 * returns the full set of snapshot values to persist.
 *
 * For package USE mode, requires the patient's currently-remaining
 * balance for that product (so we can verify the use is allowed).
 * `excludeTreatmentId` lets the edit flow exclude the row being edited
 * from the balance calculation (so editing a use-row doesn't double-count
 * its own previous vialsUsed).
 */
async function resolveAmounts(params: {
  doctorId: string;
  patientId: string;
  productId: string;
  vialsUsed: number;
  packageMode: "USE" | "PURCHASE" | undefined;
  treatmentDate: Date;
  excludeTreatmentId?: string;
}): Promise<{ ok: true; data: ResolvedAmounts } | { ok: false; error: string }> {
  const product = await db.pRPProduct.findUnique({
    where: { id: params.productId },
    select: {
      id: true,
      unitPrice: true,
      active: true,
      packageSize: true,
    },
  });
  if (!product) {
    return { ok: false, error: "找不到 PRP 品項" };
  }

  const unitPriceSnapshot = product.unitPrice;

  let billedQuantity: number;
  let totalAmount: number;

  if (product.packageSize == null) {
    // Regular product: this visit IS the purchase. unitPrice is per-vial.
    billedQuantity = params.vialsUsed;
    totalAmount = billedQuantity * unitPriceSnapshot;
  } else {
    // Package product — must specify mode.
    if (!params.packageMode) {
      return { ok: false, error: "套組品項請選擇「使用現有套組」或「購入新套組」" };
    }
    if (params.packageMode === "PURCHASE") {
      if (params.vialsUsed > product.packageSize) {
        return {
          ok: false,
          error: `本次使用瓶數（${params.vialsUsed}）不可超過套組總瓶數（${product.packageSize}）`,
        };
      }
      // Patient pays the WHOLE package upfront. unitPrice for a package
      // already represents the total (see PRPProduct schema). Don't
      // multiply by packageSize — the package size is not divisible for
      // some PLT products.
      billedQuantity = product.packageSize;
      totalAmount = unitPriceSnapshot;
    } else {
      // USE — verify there's enough remaining balance for this patient.
      const agg = await db.treatmentRecord.aggregate({
        where: {
          patientId: params.patientId,
          productId: product.id,
          ...(params.excludeTreatmentId
            ? { id: { not: params.excludeTreatmentId } }
            : {}),
        },
        _sum: { quantity: true, vialsUsed: true },
      });
      const purchased = agg._sum.quantity ?? 0;
      const usedSoFar = agg._sum.vialsUsed ?? 0;
      const remaining = purchased - usedSoFar;
      if (params.vialsUsed > remaining) {
        return {
          ok: false,
          error: `此病人目前剩餘 ${remaining} 瓶，無法使用 ${params.vialsUsed} 瓶。請改選「購入新套組」。`,
        };
      }
      billedQuantity = 0;
      totalAmount = 0;
    }
  }

  const { rate } = await getEffectiveCommissionRate(
    params.doctorId,
    params.treatmentDate,
  );
  const commissionAmount = computeCommission(totalAmount, rate);

  return {
    ok: true,
    data: {
      billedQuantity,
      vialsUsed: params.vialsUsed,
      unitPriceSnapshot,
      totalAmount,
      commissionRateSnapshot: rate,
      commissionAmount,
    },
  };
}

export async function createTreatment(
  patientId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(["DOCTOR", "ADMIN"]);

  const parsed = treatmentInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const patient = await db.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: "找不到病人資料" };
  }

  const treatmentDate = taipeiDayStart(data.treatmentDate);

  const resolved = await resolveAmounts({
    doctorId: session.user.id,
    patientId,
    productId: data.productId,
    vialsUsed: data.vialsUsed,
    packageMode: data.packageMode,
    treatmentDate,
  });
  if (!resolved.ok) {
    return resolved;
  }
  const amounts = resolved.data;

  let createdId: string;
  try {
    const row = await db.treatmentRecord.create({
      data: {
        patientId,
        doctorId: session.user.id,
        treatmentDate,
        bodyPart: data.bodyPart,
        bodyPartDetail: data.bodyPartDetail ? data.bodyPartDetail : null,
        symptoms: data.symptoms ? data.symptoms : "",
        painBefore: data.painBefore,
        painImmediateAfter: null,
        ultrasoundNote: data.ultrasoundNote ? data.ultrasoundNote : null,
        physicianNote: data.physicianNote ? data.physicianNote : null,
        productId: data.productId,
        quantity: amounts.billedQuantity,
        vialsUsed: amounts.vialsUsed,
        unitPriceSnapshot: amounts.unitPriceSnapshot,
        totalAmount: amounts.totalAmount,
        commissionRateSnapshot: amounts.commissionRateSnapshot,
        commissionAmount: amounts.commissionAmount,
      },
      select: { id: true },
    });
    createdId = row.id;
  } catch (err) {
    console.error("createTreatment failed", err);
    return { ok: false, error: "儲存治療紀錄失敗" };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");
  // Bust the cached aggregates so the new treatment shows up immediately
  // on the monthly report and the analytics insights instead of waiting
  // for the 5-min TTL. `updateTag` is the Next.js 16 server-action
  // primitive for "read-your-own-writes" cache invalidation.
  updateTag("monthly-report");
  updateTag("monthly-trend");
  // Retention + funnel insights aggregate over every charging treatment.
  updateTag("treatments");
  // A new/edited treatment changes who counts as "dormant" or as having
  // finished a package.
  updateTag("outreach-counts");
  redirect(`/patients/${patientId}/treatments/${createdId}`);
}

export async function updateTreatment(
  patientId: string,
  treatmentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(["DOCTOR", "ADMIN"]);

  const parsed = treatmentInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const existing = await db.treatmentRecord.findUnique({
    where: { id: treatmentId },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      productId: true,
      quantity: true,
    },
  });
  if (!existing || existing.patientId !== patientId) {
    return { ok: false, error: "找不到治療紀錄" };
  }

  // DOCTOR can only edit their own treatments; ADMIN can edit anyone's.
  if (session.user.role === "DOCTOR" && existing.doctorId !== session.user.id) {
    return { ok: false, error: "僅能編輯自己建立的治療紀錄" };
  }

  const treatmentDate = taipeiDayStart(data.treatmentDate);

  // For edit, the package mode is locked to the existing record's mode
  // (USE if existing.quantity == 0, PURCHASE otherwise) when the product
  // is still a package. This prevents accidentally turning a use-visit
  // into a re-purchase or vice versa during an edit.
  let effectivePackageMode = data.packageMode;
  const newProduct = await db.pRPProduct.findUnique({
    where: { id: data.productId },
    select: { id: true, packageSize: true },
  });
  if (newProduct?.packageSize != null && data.productId === existing.productId) {
    effectivePackageMode = existing.quantity > 0 ? "PURCHASE" : "USE";
  }

  const resolved = await resolveAmounts({
    doctorId: existing.doctorId,
    patientId,
    productId: data.productId,
    vialsUsed: data.vialsUsed,
    packageMode: effectivePackageMode,
    treatmentDate,
    excludeTreatmentId: treatmentId,
  });
  if (!resolved.ok) {
    return resolved;
  }
  const amounts = resolved.data;

  try {
    await db.treatmentRecord.update({
      where: { id: treatmentId },
      data: {
        treatmentDate,
        bodyPart: data.bodyPart,
        bodyPartDetail: data.bodyPartDetail ? data.bodyPartDetail : null,
        symptoms: data.symptoms ? data.symptoms : "",
        painBefore: data.painBefore,
        // painImmediateAfter intentionally not updated — field removed from form;
        // leave existing values alone.
        ultrasoundNote: data.ultrasoundNote ? data.ultrasoundNote : null,
        physicianNote: data.physicianNote ? data.physicianNote : null,
        productId: data.productId,
        quantity: amounts.billedQuantity,
        vialsUsed: amounts.vialsUsed,
        unitPriceSnapshot: amounts.unitPriceSnapshot,
        totalAmount: amounts.totalAmount,
        commissionRateSnapshot: amounts.commissionRateSnapshot,
        commissionAmount: amounts.commissionAmount,
      },
    });
  } catch (err) {
    console.error("updateTreatment failed", err);
    return { ok: false, error: "更新治療紀錄失敗" };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/treatments/${treatmentId}`);
  // Bust report aggregates so edits to amounts/dates show up immediately.
  updateTag("monthly-report");
  updateTag("monthly-trend");
  // Retention + funnel insights aggregate over every charging treatment.
  updateTag("treatments");
  // A new/edited treatment changes who counts as "dormant" or as having
  // finished a package.
  updateTag("outreach-counts");
  redirect(`/patients/${patientId}/treatments/${treatmentId}`);
}
