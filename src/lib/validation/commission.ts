import { z } from "zod";

/**
 * Commission rate input.
 *
 * UX: users type a percentage (e.g. `35` = 35%).
 * Storage: Prisma column is a `Float` in fraction form (0.35).
 * The conversion `/100` happens in the server action after validation.
 */
export const commissionInputSchema = z.object({
  doctorId: z.string().trim().min(1, "請選擇醫師"),
  ratePercent: z.coerce
    .number({ invalid_type_error: "請輸入數字" })
    .min(0, "抽成比例不可為負")
    .max(100, "抽成比例不可超過 100%"),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生效日期格式需為 YYYY-MM-DD"),
  note: z
    .string()
    .trim()
    .max(500, "備註過長")
    .optional()
    .or(z.literal("")),
});

export type CommissionInput = z.infer<typeof commissionInputSchema>;
