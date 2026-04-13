import { z } from "zod";

/**
 * Validation for PRPProduct create/update.
 *
 * `active` is NOT part of the input schema — it's toggled via a separate
 * server action (`toggleProductActive`) to avoid accidental deactivation
 * while editing the name / price.
 */
export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "請輸入品項名稱")
    .max(100, "品項名稱過長"),
  unitPrice: z.coerce
    .number()
    .int("單價需為整數新台幣")
    .min(0, "單價不可為負")
    .max(1_000_000, "單價過大，請確認"),
  notes: z
    .string()
    .trim()
    .max(1000, "備註過長")
    .optional()
    .or(z.literal("")),
});

export type ProductInput = z.infer<typeof productInputSchema>;
