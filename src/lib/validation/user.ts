import { z } from "zod";
import { Role } from "@prisma/client";

/**
 * Only ADMIN and STAFF are user-selectable in the admin UI, matching the
 * clinic's current staffing: 院長 (ADMIN) + 護理師 (STAFF). The Prisma enum
 * still contains DOCTOR for future multi-doctor setups — existing DOCTOR
 * records keep working, the UI just won't create new ones.
 */
export const UI_ROLE_VALUES = [Role.ADMIN, Role.STAFF] as const;

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "請輸入姓名").max(100),
  email: z.string().trim().email("Email 格式錯誤").max(200),
  password: z
    .string()
    .min(8, "密碼至少 8 個字元")
    .max(200, "密碼過長"),
  passwordConfirm: z.string(),
  role: z.enum(UI_ROLE_VALUES, {
    errorMap: () => ({ message: "請選擇角色" }),
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "兩次輸入的密碼不一致",
  path: ["passwordConfirm"],
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "請輸入姓名").max(100),
  email: z.string().trim().email("Email 格式錯誤").max(200),
  role: z.enum(UI_ROLE_VALUES, {
    errorMap: () => ({ message: "請選擇角色" }),
  }),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const passwordChangeSchema = z
  .object({
    password: z.string().min(8, "密碼至少 8 個字元").max(200, "密碼過長"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "兩次輸入的密碼不一致",
    path: ["passwordConfirm"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
