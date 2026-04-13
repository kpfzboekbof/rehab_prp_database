import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

/**
 * Follow-up appointment input. `scheduledAt` comes from an
 * `<input type="datetime-local">` as `YYYY-MM-DDTHH:mm`; the server action
 * converts it to a UTC Date via `taipeiDateTimeToUTC`.
 */
export const appointmentInputSchema = z.object({
  patientId: z.string().trim().min(1, "請選擇病人"),
  scheduledAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      "回診時間格式需為 YYYY-MM-DDTHH:mm",
    ),
  status: z.nativeEnum(AppointmentStatus).optional(),
  reason: z
    .string()
    .trim()
    .max(500, "備註過長")
    .optional()
    .or(z.literal("")),
  sourceTreatmentId: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

/**
 * Standalone schema used by the quick-status-change action (single enum).
 */
export const appointmentStatusSchema = z.nativeEnum(AppointmentStatus);
