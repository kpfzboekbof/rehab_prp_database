import { z } from "zod";
import { Gender } from "@prisma/client";

/**
 * Shared input schema for Patient create/update — used by both the
 * client form (via `useActionState` error display) and server actions
 * (via `safeParse`). Keep all validation rules here so there's a single
 * source of truth for allowable input.
 *
 * Note: the form asks for `age` (integer), not birth date. The server
 * action synthesises a `birthDate` by subtracting the age from today,
 * so the stored `Patient.birthDate` column and the `ageAt()` display
 * helper continue to work unchanged. Ages drift at most ±1 year from
 * reality, which is fine for clinical segmentation.
 */
export const patientInputSchema = z.object({
  chartNumber: z
    .string()
    .trim()
    .min(1, "請輸入病歷號")
    .max(50, "病歷號過長（最多 50 字）"),
  name: z.string().trim().min(1, "請輸入姓名").max(100, "姓名過長"),
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({ message: "請選擇性別" }),
  }),
  age: z.coerce
    .number({ invalid_type_error: "請輸入年齡" })
    .int("年齡需為整數")
    .min(0, "年齡不可為負")
    .max(120, "年齡超出合理範圍"),
  phone: z
    .string()
    .trim()
    .max(20, "電話號碼過長")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(200, "地址過長")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "備註過長（最多 2000 字）")
    .optional()
    .or(z.literal("")),
});

export type PatientInput = z.infer<typeof patientInputSchema>;

