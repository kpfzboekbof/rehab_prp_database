"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { followUpCallInputSchema } from "@/lib/validation/follow-up-call";
import { callDayForAppointment } from "@/server/queries/reminders";
import { requireRole } from "@/server/rbac";

export type ActionState = { ok: false; error: string } | { ok: true } | null;

/**
 * Upsert a FollowUpCall for an appointment. On create, `calledAt` and
 * `calledById` are stamped from the session; on update we preserve the
 * original stamps (the call's identity is "when it first happened").
 *
 * Side effect: when the nurse ticks "回診已確認" and the appointment is
 * still in SCHEDULED state, we bump it to CONFIRMED so the calendar
 * view reflects the confirmation. Other statuses (COMPLETED, NO_SHOW,
 * CANCELLED) are left alone — those transitions belong to the day panel.
 */
export async function recordFollowUpCall(
  appointmentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const appointment = await db.followUpAppointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      status: true,
      scheduledAt: true,
      followUpCall: { select: { id: true } },
    },
  });
  if (!appointment) {
    return { ok: false, error: "找不到回診排程" };
  }

  const raw = {
    symptomImprovement: formData.get("symptomImprovement")?.toString() ?? "",
    longTermPainImprovement:
      formData.get("longTermPainImprovement")?.toString() ?? "",
    educationDone: formData.get("educationDone") === "on",
    appointmentConfirmed: formData.get("appointmentConfirmed") === "on",
    patientFeedback: formData.get("patientFeedback")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };

  const parsed = followUpCallInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const dataToSave = {
    symptomImprovement: data.symptomImprovement ? data.symptomImprovement : null,
    longTermPainImprovement:
      data.longTermPainImprovement === "" ||
      data.longTermPainImprovement === undefined
        ? null
        : Number(data.longTermPainImprovement),
    educationDone: data.educationDone,
    appointmentConfirmed: data.appointmentConfirmed,
    patientFeedback: data.patientFeedback ? data.patientFeedback : null,
    notes: data.notes ? data.notes : null,
  };

  try {
    await db.$transaction(async (tx) => {
      if (appointment.followUpCall) {
        // Update existing — do NOT touch calledAt / calledById.
        await tx.followUpCall.update({
          where: { id: appointment.followUpCall.id },
          data: dataToSave,
        });
      } else {
        await tx.followUpCall.create({
          data: {
            ...dataToSave,
            appointmentId,
            calledById: session.user.id,
          },
        });
      }

      // Auto-confirm the appointment if the patient confirmed on the call
      // and no later state has already been set.
      if (data.appointmentConfirmed && appointment.status === "SCHEDULED") {
        await tx.followUpAppointment.update({
          where: { id: appointmentId },
          data: { status: "CONFIRMED" },
        });
      }
    });
  } catch (err) {
    console.error("recordFollowUpCall failed", err);
    return { ok: false, error: "儲存電訪紀錄失敗" };
  }

  revalidatePath("/reminders");
  revalidatePath("/calendar");
  revalidatePath(`/patients/${appointment.patientId}`);
  // Return the nurse to the same call-day view they were working from,
  // so a batch of calls flows through the list without losing context.
  const callDay = callDayForAppointment(appointment.scheduledAt);
  redirect(`/reminders?date=${callDay}`);
}
