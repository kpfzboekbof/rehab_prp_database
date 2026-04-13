import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Follow-up reminder queries. "Due" = upcoming (or slightly overdue)
 * appointments that have not been called yet; "Completed" = same window
 * but with a call already recorded. Both include enough patient /
 * treatment context for the nurse to make the call intelligently.
 */

const WINDOW_PAST_DAYS = 3;
const WINDOW_FUTURE_DAYS = 14;
const COMPLETED_LOOKBACK_DAYS = 30;

const reminderInclude = {
  patient: {
    select: {
      id: true,
      name: true,
      chartNumber: true,
      phone: true,
      gender: true,
      birthDate: true,
    },
  },
  sourceTreatment: {
    select: {
      id: true,
      treatmentDate: true,
      bodyPart: true,
      bodyPartDetail: true,
      product: { select: { id: true, name: true, packageSize: true } },
    },
  },
  followUpCall: {
    include: {
      calledBy: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.FollowUpAppointmentInclude;

function windowBounds(pastDays: number, futureDays: number) {
  const now = new Date();
  const past = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000);
  return { past, future };
}

/**
 * Appointments the nurse still needs to call: within our window, not
 * cancelled, and no `FollowUpCall` row yet.
 */
export async function listDueReminders() {
  const { past, future } = windowBounds(WINDOW_PAST_DAYS, WINDOW_FUTURE_DAYS);

  return db.followUpAppointment.findMany({
    where: {
      scheduledAt: { gte: past, lte: future },
      status: { not: "CANCELLED" },
      followUpCall: { is: null },
    },
    orderBy: { scheduledAt: "asc" },
    include: reminderInclude,
  });
}

/**
 * Recently-called appointments — for reference and re-editing. Shows
 * the last 30 days of completed calls (regardless of the appointment's
 * own scheduledAt) so the nurse can review their recent work.
 */
export async function listCompletedReminders() {
  const cutoff = new Date(
    Date.now() - COMPLETED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  return db.followUpAppointment.findMany({
    where: {
      followUpCall: {
        is: {
          calledAt: { gte: cutoff },
        },
      },
    },
    orderBy: [{ followUpCall: { calledAt: "desc" } }],
    take: 50,
    include: reminderInclude,
  });
}

/**
 * Count of due reminders — used by the dashboard card.
 */
export async function countDueReminders(): Promise<number> {
  const { past, future } = windowBounds(WINDOW_PAST_DAYS, WINDOW_FUTURE_DAYS);
  return db.followUpAppointment.count({
    where: {
      scheduledAt: { gte: past, lte: future },
      status: { not: "CANCELLED" },
      followUpCall: { is: null },
    },
  });
}

/**
 * Single appointment with patient + call (for the call form page).
 */
export async function getAppointmentForCall(appointmentId: string) {
  return db.followUpAppointment.findUnique({
    where: { id: appointmentId },
    include: reminderInclude,
  });
}
