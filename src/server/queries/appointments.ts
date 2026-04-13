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

// Order by date ascending, then by session enum order (MORNING < AFTERNOON < EVENING)
// so same-day appointments are listed earliest-session first.
const appointmentOrder = [
  { scheduledAt: "asc" },
  { session: "asc" },
] satisfies Prisma.FollowUpAppointmentOrderByWithRelationInput[];

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
    orderBy: appointmentOrder,
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
    orderBy: appointmentOrder,
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
 * Upcoming (scheduledAt >= today-start-Taipei) non-cancelled appointments
 * for a patient. Used on the patient detail page.
 *
 * `scheduledAt` is stored as Taipei-midnight of the appointment day,
 * so "appointments from today onwards" means `gte` today's Taipei-midnight.
 */
export async function listUpcomingForPatient(patientId: string, limit = 20) {
  const today = new Date();
  const todayKeyParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const todayStart = taipeiDayStart(todayKeyParts);

  return db.followUpAppointment.findMany({
    where: {
      patientId,
      scheduledAt: { gte: todayStart },
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: appointmentOrder,
    take: limit,
    include: appointmentInclude,
  });
}

/**
 * Past appointments for a patient (scheduledAt < today OR a terminal status).
 * Used on the patient detail page to show history.
 */
export async function listPastForPatient(patientId: string, limit = 20) {
  const today = new Date();
  const todayKeyParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const todayStart = taipeiDayStart(todayKeyParts);

  return db.followUpAppointment.findMany({
    where: {
      patientId,
      OR: [
        { scheduledAt: { lt: todayStart } },
        { status: { in: ["COMPLETED", "NO_SHOW", "CANCELLED"] } },
      ],
    },
    orderBy: [{ scheduledAt: "desc" }, { session: "desc" }],
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
