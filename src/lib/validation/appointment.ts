import { z } from "zod";
import { AppointmentSession, AppointmentStatus } from "@prisma/client";

/**
 * Follow-up appointment input. The form gives us a calendar date
 * (`YYYY-MM-DD`) and a session (早診/午診/晚診); the server action
 * converts the date into a Taipei-midnight UTC `Date` and stores it
 * in `scheduledAt`, while `session` goes into its own column.
 */
export const appointmentInputSchema = z.object({
  patientId: z.string().trim().min(1, "請選擇病人"),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "回診日期格式需為 YYYY-MM-DD"),
  session: z.nativeEnum(AppointmentSession, {
    errorMap: () => ({ message: "請選擇診次" }),
  }),
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
