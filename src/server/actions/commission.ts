"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { taipeiDayStart } from "@/lib/date";
import { commissionInputSchema } from "@/lib/validation/commission";
import {
  getDoctorForCommission,
  getLatestRateFor,
} from "@/server/queries/commission";
import { requireRole } from "@/server/rbac";

/**
 * Commission history is append-only:
 *
 * - Creating a new rate closes the doctor's currently-open rate (the one
 *   whose `effectiveTo` is NULL) by setting its `effectiveTo` equal to the
 *   new rate's `effectiveFrom`. This keeps the history a clean sequence of
 *   non-overlapping `[effectiveFrom, effectiveTo)` intervals.
 *
 * - New rates must strictly succeed every existing rate for the same doctor
 *   (new.effectiveFrom > max(existing.effectiveFrom)). Inserting in the
 *   middle of history is disallowed — fix mistakes by deleting and re-adding.
 *
 * - Deleting is limited to the currently-open rate. On delete we find the
 *   rate that was CLOSED by the deleted one (effectiveTo == deleted.effectiveFrom)
 *   and reopen it (effectiveTo = null). This is effectively "undo last add".
 *
 * Because `TreatmentRecord.commissionRateSnapshot` is frozen on save, none
 * of the above operations can retroactively change historical revenue or
 * commission reports.
 */

export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readInput(formData: FormData) {
  return {
    doctorId: formData.get("doctorId")?.toString() ?? "",
    ratePercent: formData.get("ratePercent")?.toString() ?? "",
    effectiveFrom: formData.get("effectiveFrom")?.toString() ?? "",
    note: formData.get("note")?.toString() ?? "",
  };
}

export async function createCommissionRate(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = commissionInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const doctor = await getDoctorForCommission(data.doctorId);
  if (!doctor) {
    return { ok: false, error: "找不到指定醫師" };
  }

  const newEffectiveFrom = taipeiDayStart(data.effectiveFrom);

  // Enforce append-only: new.effectiveFrom must be strictly after every
  // existing rate's effectiveFrom for this doctor.
  const latest = await getLatestRateFor(data.doctorId);
  if (latest && latest.effectiveFrom >= newEffectiveFrom) {
    return {
      ok: false,
      error: "生效日必須晚於該醫師最近一筆抽成規則的生效日",
    };
  }

  const rateFraction = data.ratePercent / 100;

  try {
    await db.$transaction(async (tx) => {
      // Close the currently-open rate (if any) by stamping its effectiveTo.
      if (latest && latest.effectiveTo === null) {
        await tx.doctorCommissionRate.update({
          where: { id: latest.id },
          data: { effectiveTo: newEffectiveFrom },
        });
      }

      await tx.doctorCommissionRate.create({
        data: {
          doctorId: data.doctorId,
          rate: rateFraction,
          effectiveFrom: newEffectiveFrom,
          note: data.note ? data.note : null,
        },
      });
    });
  } catch (err) {
    console.error("createCommissionRate failed", err);
    return { ok: false, error: "儲存抽成規則失敗" };
  }

  revalidatePath("/admin/commission");
  redirect("/admin/commission");
}

/**
 * Delete a commission rate — only allowed on the currently-open rate
 * (effectiveTo IS NULL), which is effectively "undo the last add". The
 * previous rate (if any) is reopened by clearing its effectiveTo.
 */
export async function deleteCommissionRate(id: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const existing = await db.doctorCommissionRate.findUnique({
    where: { id },
    select: { id: true, doctorId: true, effectiveFrom: true, effectiveTo: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到抽成規則" };
  }
  if (existing.effectiveTo !== null) {
    return {
      ok: false,
      error: "只能刪除目前有效（尚未被後續規則取代）的抽成規則",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.doctorCommissionRate.delete({ where: { id } });

      // Reopen the rate that was closed BY this one.
      const previous = await tx.doctorCommissionRate.findFirst({
        where: {
          doctorId: existing.doctorId,
          effectiveTo: existing.effectiveFrom,
        },
        orderBy: { effectiveFrom: "desc" },
      });
      if (previous) {
        await tx.doctorCommissionRate.update({
          where: { id: previous.id },
          data: { effectiveTo: null },
        });
      }
    });
  } catch (err) {
    console.error("deleteCommissionRate failed", err);
    return { ok: false, error: "刪除失敗" };
  }

  revalidatePath("/admin/commission");
  return { ok: true };
}
