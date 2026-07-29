import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  addDaysToTaipeiKey,
  taipeiDateKey,
  taipeiDayEnd,
  taipeiDayStart,
} from "@/lib/date";

/**
 * Reminder rule: by default, nurses call patients **7 days before** the
 * scheduled follow-up visit. So "today's reminder list" on call day D is
 * every appointment whose `scheduledAt` falls on Taipei calendar day
 * (D + 7 days).
 *
 * The page accepts a `?date=YYYY-MM-DD` to override the call day (so the
 * nurse can preview tomorrow's list or catch up on yesterday's missed
 * calls) — all the queries in this file take an explicit Taipei date key.
 */

export const REMINDER_LEAD_DAYS = 7;

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

/**
 * Returns the Taipei date key corresponding to "appointment day" for a
 * given "call day". E.g. callDay 2026-04-13 → apptDay 2026-04-20.
 */
export function appointmentDayForCallDay(callDayKey: string): string {
  return addDaysToTaipeiKey(callDayKey, REMINDER_LEAD_DAYS);
}

/**
 * Inverse: given an appointment's UTC scheduledAt, returns the Taipei
 * date key of the day it should be called on.
 */
export function callDayForAppointment(scheduledAt: Date): string {
  const apptKey = taipeiDateKey(scheduledAt);
  return addDaysToTaipeiKey(apptKey, -REMINDER_LEAD_DAYS);
}

/**
 * Today's Taipei date key (the default call day for the reminder page).
 */
export function todayCallDayKey(): string {
  return taipeiDateKey(new Date());
}

/**
 * Appointments the nurse still needs to call on a given call day.
 * Filters by appointmentDay = callDay + 7, excluding cancelled and
 * already-called.
 */
export async function listDueRemindersForCallDay(callDayKey: string) {
  const apptDayKey = appointmentDayForCallDay(callDayKey);

  return db.followUpAppointment.findMany({
    where: {
      scheduledAt: {
        gte: taipeiDayStart(apptDayKey),
        lt: taipeiDayEnd(apptDayKey),
      },
      status: { not: "CANCELLED" },
      followUpCall: { is: null },
    },
    orderBy: { scheduledAt: "asc" },
    // One statement with LATERAL JOINs instead of a follow-up query per
    // relation. `reminderInclude` pulls patient + sourceTreatment.product +
    // followUpCall.calledBy, which cost four extra round-trips each way.
    relationLoadStrategy: "join",
    include: reminderInclude,
  });
}

/**
 * Appointments on the same call day that already have a call recorded —
 * for the nurse to review or edit after completing the initial calls.
 */
export async function listCompletedRemindersForCallDay(callDayKey: string) {
  const apptDayKey = appointmentDayForCallDay(callDayKey);

  return db.followUpAppointment.findMany({
    where: {
      scheduledAt: {
        gte: taipeiDayStart(apptDayKey),
        lt: taipeiDayEnd(apptDayKey),
      },
      followUpCall: { isNot: null },
    },
    orderBy: { scheduledAt: "asc" },
    relationLoadStrategy: "join",
    include: reminderInclude,
  });
}

/**
 * Dashboard-card count: patients needing a reminder call TODAY.
 */
export async function countDueRemindersToday(): Promise<number> {
  const callDayKey = todayCallDayKey();
  const apptDayKey = appointmentDayForCallDay(callDayKey);
  return db.followUpAppointment.count({
    where: {
      scheduledAt: {
        gte: taipeiDayStart(apptDayKey),
        lt: taipeiDayEnd(apptDayKey),
      },
      status: { not: "CANCELLED" },
      followUpCall: { is: null },
    },
  });
}

/**
 * Which call days in a given month have at least one pending reminder?
 * Used by the mini calendar to put a dot under busy days.
 *
 * Implementation: query all appointments whose scheduledAt falls in the
 * "appointment window" shifted by +REMINDER_LEAD_DAYS from the month,
 * then map each one back to its call day.
 */
export async function getBusyCallDaysInMonth(
  year: number,
  month: number,
): Promise<Set<string>> {
  // First and (exclusive) last call day of the shown month.
  const firstCallDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const firstCallDayNextMonth = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const firstApptDay = appointmentDayForCallDay(firstCallDay);
  const firstApptDayNextMonth = appointmentDayForCallDay(firstCallDayNextMonth);

  const rows = await db.followUpAppointment.findMany({
    where: {
      scheduledAt: {
        gte: taipeiDayStart(firstApptDay),
        lt: taipeiDayStart(firstApptDayNextMonth),
      },
      status: { not: "CANCELLED" },
      followUpCall: { is: null },
    },
    select: { scheduledAt: true },
  });

  const busy = new Set<string>();
  for (const r of rows) {
    busy.add(callDayForAppointment(r.scheduledAt));
  }
  return busy;
}

/**
 * Single appointment with patient + call (for the call form page).
 */
export async function getAppointmentForCall(appointmentId: string) {
  return db.followUpAppointment.findUnique({
    where: { id: appointmentId },
    relationLoadStrategy: "join",
    include: reminderInclude,
  });
}
