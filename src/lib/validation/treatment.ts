import { z } from "zod";
import { BodyPart } from "@prisma/client";

/**
 * Validation for TreatmentRecord create/update.
 *
 * Semantics:
 * - `vialsUsed` = vials actually injected this visit. Required, >= 1.
 * - `packageMode` = "USE" | "PURCHASE", optional:
 *     - For REGULAR products (product.packageSize == null), ignored.
 *     - For PACKAGE products, required:
 *         "PURCHASE" = this visit is the upfront purchase. Server will
 *                      snapshot the full package price (packageSize × unit).
 *         "USE"      = this visit draws from a previously-purchased
 *                      package. totalAmount = 0. Server verifies there's
 *                      enough remaining balance.
 *
 * Snapshot fields (unitPriceSnapshot, totalAmount, commissionRateSnapshot,
 * commissionAmount) are NOT part of the input — they are computed
 * server-side from `productId`, `vialsUsed`, `packageMode`, and the
 * doctor's effective commission rate.
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
  vialsUsed: z.coerce
    .number()
    .int("注射瓶數需為整數")
    .min(1, "本次至少注射 1 瓶")
    .max(1000, "數量過大，請確認"),
  packageMode: z.enum(["USE", "PURCHASE"]).optional(),
  ultrasoundNote: z.string().trim().max(2000).optional().or(z.literal("")),
  physicianNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type TreatmentInput = z.infer<typeof treatmentInputSchema>;
