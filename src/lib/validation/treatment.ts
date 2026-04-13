import { z } from "zod";
import { BodyPart } from "@prisma/client";

/**
 * Validation for TreatmentRecord create/update. Numeric fields arrive from
 * the form as strings; coerce and clamp them here so server actions can
 * trust the parsed shape.
 *
 * Snapshot fields (unitPriceSnapshot, totalAmount, commissionRateSnapshot,
 * commissionAmount) are NOT part of the input — they are computed server-side
 * from `productId`, `quantity`, and the doctor's effective commission rate.
 */
export const treatmentInputSchema = z.object({
  treatmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "治療日期格式需為 YYYY-MM-DD"),
  bodyPart: z.nativeEnum(BodyPart, {
    errorMap: () => ({ message: "請選擇治療部位" }),
  }),
  bodyPartDetail: z.string().trim().max(200).optional().or(z.literal("")),
  symptoms: z
    .string()
    .trim()
    .min(1, "請輸入症狀")
    .max(2000, "症狀描述過長"),
  painBefore: z.coerce
    .number()
    .int("疼痛分數需為整數")
    .min(0, "疼痛分數介於 0 到 10")
    .max(10, "疼痛分數介於 0 到 10"),
  painImmediateAfter: z
    .union([
      z.literal(""),
      z.coerce.number().int().min(0).max(10),
    ])
    .optional(),
  productId: z.string().trim().min(1, "請選擇 PRP 品項"),
  quantity: z.coerce
    .number()
    .int("數量需為正整數")
    .min(1, "數量至少為 1")
    .max(100, "數量過大，請確認"),
  ultrasoundNote: z.string().trim().max(2000).optional().or(z.literal("")),
  physicianNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type TreatmentInput = z.infer<typeof treatmentInputSchema>;
