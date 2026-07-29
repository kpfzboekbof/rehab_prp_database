"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { taipeiDateKey, taipeiDayStart } from "@/lib/date";
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
    scheduledDate: formData.get("scheduledDate")?.toString() ?? "",
    session: formData.get("session")?.toString() ?? "",
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

  // scheduledAt stores the Taipei midnight of the appointment day.
  // Time-of-day lives in `session`.
  const scheduledAtUTC = taipeiDayStart(data.scheduledDate);

  await db.followUpAppointment.create({
    data: {
      patientId: data.patientId,
      scheduledAt: scheduledAtUTC,
      session: data.session,
      status: data.status ?? AppointmentStatus.SCHEDULED,
      reason: data.reason ? data.reason : null,
      sourceTreatmentId: data.sourceTreatmentId ? data.sourceTreatmentId : null,
    },
    select: { id: true },
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${data.patientId}`);
  // Session-utilisation heatmap + the "no upcoming appointment" predicate
  // behind the outreach lists both key off appointments.
  updateTag("appointments");
  updateTag("outreach-counts");
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

  const scheduledAtUTC = taipeiDayStart(data.scheduledDate);

  await db.followUpAppointment.update({
    where: { id },
    data: {
      patientId: data.patientId,
      scheduledAt: scheduledAtUTC,
      session: data.session,
      status: data.status ?? AppointmentStatus.SCHEDULED,
      reason: data.reason ? data.reason : null,
      sourceTreatmentId: data.sourceTreatmentId ? data.sourceTreatmentId : null,
    },
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${data.patientId}`);
  // Session-utilisation heatmap + the "no upcoming appointment" predicate
  // behind the outreach lists both key off appointments.
  updateTag("appointments");
  updateTag("outreach-counts");
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
  updateTag("appointments");
  updateTag("outreach-counts");
  return { ok: true };
}

/**
 * Hard-delete an appointment. Unlike `Patient`, appointments are not
 * subject to the 7-year medical-record retention rule — they're a
 * scheduling artifact, not a clinical record. Wrongly-scheduled or
 * duplicate entries are removed outright.
 *
 * If the appointment has a linked `FollowUpCall`, it cascades via the
 * `onDelete: Cascade` on the schema's FK, so we do not need to delete
 * it explicitly. That's an intentional design choice: if you delete
 * the appointment the reminder phone call lost context anyway.
 *
 * Open to DOCTOR / STAFF / ADMIN, matching create/update permissions.
 */
export async function deleteAppointment(id: string): Promise<ActionState> {
  await requireRole([...CLINICAL_ROLES]);

  const existing = await db.followUpAppointment.findUnique({
    where: { id },
    select: { id: true, patientId: true, scheduledAt: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到回診排程" };
  }

  try {
    await db.followUpAppointment.delete({ where: { id } });
  } catch (err) {
    console.error("deleteAppointment failed", err);
    return { ok: false, error: "刪除失敗" };
  }

  revalidatePath("/calendar");
  revalidatePath(`/patients/${existing.patientId}`);
  revalidatePath("/reminders");
  updateTag("appointments");
  updateTag("outreach-counts");
  redirect(`/calendar?day=${taipeiDateKey(existing.scheduledAt)}`);
}
