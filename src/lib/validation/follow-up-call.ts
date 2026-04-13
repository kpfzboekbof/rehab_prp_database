import { z } from "zod";

/**
 * Validation for the follow-up call form (the nurse records the outcome
 * of a reminder phone call before the patient's follow-up visit).
 *
 * The schema accepts booleans directly; the server action is responsible
 * for converting HTML checkbox values (`"on"` / missing) into booleans
 * before calling `safeParse`.
 */
export const followUpCallInputSchema = z.object({
  symptomImprovement: z
    .string()
    .trim()
    .max(2000, "症狀改善描述過長")
    .optional()
    .or(z.literal("")),
  longTermPainImprovement: z
    .union([
      z.literal(""),
      z.coerce.number().int().min(0, "疼痛分數 0–10").max(10, "疼痛分數 0–10"),
    ])
    .optional(),
  educationDone: z.boolean(),
  appointmentConfirmed: z.boolean(),
  patientFeedback: z
    .string()
    .trim()
    .max(2000, "病人回報事項過長")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "備註過長")
    .optional()
    .or(z.literal("")),
});

export type FollowUpCallInput = z.infer<typeof followUpCallInputSchema>;
