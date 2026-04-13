import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { taipeiDayEnd, taipeiDayStart } from "@/lib/date";

const appointmentInclude = {
  patient: { select: { id: true, name: true, chartNumber: true, phone: true } },
  sourceTreatment: {
    select: {
      id: true,
      treatmentDate: true,
      bodyPart: true,
    },
  },
  followUpCall: { select: { id: true } },
} satisfies Prisma.FollowUpAppointmentInclude;

/**
 * All appointments whose `scheduledAt` falls within the given Taipei month.
 * The window is `[first day 00:00 Taipei, first day of next month 00:00 Taipei)`.
 */
export async function listAppointmentsForMonth(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const next = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const start = taipeiDayStart(first);
  const end = taipeiDayStart(next);

  return db.followUpAppointment.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
    },
    orderBy: { scheduledAt: "asc" },
    include: appointmentInclude,
  });
}

/**
 * Appointments for a single Taipei calendar day.
 */
export async function listAppointmentsForDay(yyyyMmDd: string) {
  return db.followUpAppointment.findMany({
    where: {
      scheduledAt: {
        gte: taipeiDayStart(yyyyMmDd),
        lt: taipeiDayEnd(yyyyMmDd),
      },
    },
    orderBy: { scheduledAt: "asc" },
    include: appointmentInclude,
  });
}

export async function getAppointment(id: string) {
  return db.followUpAppointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
}

/**
 * Upcoming (scheduledAt >= now) non-cancelled appointments for a patient.
 * Used on the patient detail page.
 */
export async function listUpcomingForPatient(patientId: string, limit = 20) {
  return db.followUpAppointment.findMany({
    where: {
      patientId,
      scheduledAt: { gte: new Date() },
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    include: appointmentInclude,
  });
}

/**
 * Past appointments for a patient (scheduledAt < now OR status COMPLETED/NO_SHOW/CANCELLED).
 * Used on the patient detail page to show history.
 */
export async function listPastForPatient(patientId: string, limit = 20) {
  return db.followUpAppointment.findMany({
    where: {
      patientId,
      OR: [
        { scheduledAt: { lt: new Date() } },
        { status: { in: ["COMPLETED", "NO_SHOW", "CANCELLED"] } },
      ],
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: appointmentInclude,
  });
}

/**
 * Lightweight list of all non-deleted patients for the appointment form's
 * picker. Small clinic → return all sorted by name.
 */
export async function listPatientsForPicker() {
  return db.patient.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, chartNumber: true },
  });
}
