"use server";

import { revalidatePath } from "next/cache";
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
 *   - totalAmount            ← quantity * unitPriceSnapshot
 *   - commissionRateSnapshot ← doctor's effective rate on treatmentDate
 *   - commissionAmount       ← totalAmount * rate (rounded to integer TWD)
 *
 * These are NEVER recomputed from source tables after the record exists,
 * so monthly revenue / commission reports are a pure aggregation over
 * immutable rows. Edits re-snapshot on purpose: if you edit to fix a typo
 * in quantity, the total and commission should update to match.
 */

export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readInput(formData: FormData) {
  return {
    treatmentDate: formData.get("treatmentDate")?.toString() ?? "",
    bodyPart: formData.get("bodyPart")?.toString() ?? "",
    bodyPartDetail: formData.get("bodyPartDetail")?.toString() ?? "",
    symptoms: formData.get("symptoms")?.toString() ?? "",
    painBefore: formData.get("painBefore")?.toString() ?? "",
    painImmediateAfter: formData.get("painImmediateAfter")?.toString() ?? "",
    productId: formData.get("productId")?.toString() ?? "",
    quantity: formData.get("quantity")?.toString() ?? "",
    ultrasoundNote: formData.get("ultrasoundNote")?.toString() ?? "",
    physicianNote: formData.get("physicianNote")?.toString() ?? "",
  };
}

async function buildSnapshot(
  doctorId: string,
  productId: string,
  quantity: number,
  treatmentDate: Date,
) {
  const product = await db.pRPProduct.findUnique({
    where: { id: productId },
    select: { id: true, unitPrice: true, active: true },
  });
  if (!product) {
    throw new Error("找不到 PRP 品項");
  }

  const unitPriceSnapshot = product.unitPrice;
  const totalAmount = unitPriceSnapshot * quantity;

  const { rate } = await getEffectiveCommissionRate(doctorId, treatmentDate);
  const commissionAmount = computeCommission(totalAmount, rate);

  return {
    unitPriceSnapshot,
    totalAmount,
    commissionRateSnapshot: rate,
    commissionAmount,
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

  let snapshot;
  try {
    snapshot = await buildSnapshot(
      session.user.id,
      data.productId,
      data.quantity,
      treatmentDate,
    );
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  let createdId: string;
  try {
    const row = await db.treatmentRecord.create({
      data: {
        patientId,
        doctorId: session.user.id,
        treatmentDate,
        bodyPart: data.bodyPart,
        bodyPartDetail: data.bodyPartDetail ? data.bodyPartDetail : null,
        symptoms: data.symptoms,
        painBefore: data.painBefore,
        painImmediateAfter:
          data.painImmediateAfter === "" || data.painImmediateAfter === undefined
            ? null
            : Number(data.painImmediateAfter),
        ultrasoundNote: data.ultrasoundNote ? data.ultrasoundNote : null,
        physicianNote: data.physicianNote ? data.physicianNote : null,
        productId: data.productId,
        quantity: data.quantity,
        ...snapshot,
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
    select: { id: true, patientId: true, doctorId: true },
  });
  if (!existing || existing.patientId !== patientId) {
    return { ok: false, error: "找不到治療紀錄" };
  }

  // DOCTOR can only edit their own treatments; ADMIN can edit anyone's.
  if (session.user.role === "DOCTOR" && existing.doctorId !== session.user.id) {
    return { ok: false, error: "僅能編輯自己建立的治療紀錄" };
  }

  const treatmentDate = taipeiDayStart(data.treatmentDate);

  let snapshot;
  try {
    snapshot = await buildSnapshot(
      existing.doctorId,
      data.productId,
      data.quantity,
      treatmentDate,
    );
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  try {
    await db.treatmentRecord.update({
      where: { id: treatmentId },
      data: {
        treatmentDate,
        bodyPart: data.bodyPart,
        bodyPartDetail: data.bodyPartDetail ? data.bodyPartDetail : null,
        symptoms: data.symptoms,
        painBefore: data.painBefore,
        painImmediateAfter:
          data.painImmediateAfter === "" || data.painImmediateAfter === undefined
            ? null
            : Number(data.painImmediateAfter),
        ultrasoundNote: data.ultrasoundNote ? data.ultrasoundNote : null,
        physicianNote: data.physicianNote ? data.physicianNote : null,
        productId: data.productId,
        quantity: data.quantity,
        ...snapshot,
      },
    });
  } catch (err) {
    console.error("updateTreatment failed", err);
    return { ok: false, error: "更新治療紀錄失敗" };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/treatments/${treatmentId}`);
  redirect(`/patients/${patientId}/treatments/${treatmentId}`);
}
