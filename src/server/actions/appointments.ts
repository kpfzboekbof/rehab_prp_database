"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { taipeiDateTimeToUTC, taipeiDateKey } from "@/lib/date";
import {
  appointmentInputSchema,
  appointmentStatusSchema,
} from "@/lib/validation/appointment";
import { requireRole } from "@/server/rbac";

/**
 * Appointment management is open to all clinical roles. Scheduling is
 * typically a nurse's job, so STAFF is allowed to create/edit/cancel
 * appointments as well as DOCTOR / ADMIN.
 */
const CLINICAL_ROLES = ["DOCTOR", "STAFF", "ADMIN"] as const;

export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readInput(formData: FormData) {
  return {
    patientId: formData.get("patientId")?.toString() ?? "",
    scheduledAt: formData.get("scheduledAt")?.toString() ?? "",
    status: formData.get("status")?.toString() || undefined,
    reason: formData.get("reason")?.toString() ?? "",
    sourceTreatmentId: formData.get("sourceTreatmentId")?.toString() ?? "",
  };
}

export async function createAppointment(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([...CLINICAL_ROLES]);

  const parsed = appointmentInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  // Confirm patient exists and is not soft-deleted.
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: "找不到病人資料" };
  }

  // If a sourceTreatment was given, verify it belongs to the same patient.
  if (data.sourceTreatmentId) {
    const treatment = await db.treatmentRecord.findUnique({
      where: { id: data.sourceTreatmentId },
      select: { patientId: true },
    });
    if (!treatment || treatment.patientId !== data.patientId) {
      return { ok: false, error: "指定的治療紀錄與病人不符" };
    }
  }

  const scheduledAtUTC = taipeiDateTimeToUTC(data.scheduledAt);

  const created = await db.followUpAppointment.create({
    data: {
      patientId: data.patientId,
      scheduledAt: scheduledAtUTC,
      status: data.status ?? AppointmentStatus.SCHEDULED,
      reason: data.reason ? data.reason : null,
      sourceTreatmentId: data.sourceTreatmentId ? data.sourceTreatmentId : null,
    },
    select: { id: true },
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${data.patientId}`);
  redirect(`/calendar?day=${taipeiDateKey(scheduledAtUTC)}`);
}

export async function updateAppointment(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([...CLINICAL_ROLES]);

  const parsed = appointmentInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const existing = await db.followUpAppointment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到回診排程" };
  }

  const patient = await db.patient.findFirst({
    where: { id: data.patientId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: "找不到病人資料" };
  }

  if (data.sourceTreatmentId) {
    const treatment = await db.treatmentRecord.findUnique({
      where: { id: data.sourceTreatmentId },
      select: { patientId: true },
    });
    if (!treatment || treatment.patientId !== data.patientId) {
      return { ok: false, error: "指定的治療紀錄與病人不符" };
    }
  }

  const scheduledAtUTC = taipeiDateTimeToUTC(data.scheduledAt);

  await db.followUpAppointment.update({
    where: { id },
    data: {
      patientId: data.patientId,
      scheduledAt: scheduledAtUTC,
      status: data.status ?? AppointmentStatus.SCHEDULED,
      reason: data.reason ? data.reason : null,
      sourceTreatmentId: data.sourceTreatmentId ? data.sourceTreatmentId : null,
    },
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${data.patientId}`);
  redirect(`/calendar?day=${taipeiDateKey(scheduledAtUTC)}`);
}

/**
 * Quick status update — used by the status buttons on the day list.
 * Does not redirect; caller expects the page to re-render via revalidatePath.
 */
export async function updateAppointmentStatus(
  id: string,
  nextStatus: AppointmentStatus,
): Promise<ActionState> {
  await requireRole([...CLINICAL_ROLES]);

  const parsed = appointmentStatusSchema.safeParse(nextStatus);
  if (!parsed.success) {
    return { ok: false, error: "狀態值無效" };
  }

  const existing = await db.followUpAppointment.findUnique({
    where: { id },
    select: { id: true, patientId: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到回診排程" };
  }

  await db.followUpAppointment.update({
    where: { id },
    data: { status: parsed.data },
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${existing.patientId}`);
  return { ok: true };
}
