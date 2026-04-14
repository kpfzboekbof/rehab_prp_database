import type { OutreachReason } from "@prisma/client";

export const OUTREACH_REASON_LABELS: Record<OutreachReason, string> = {
  DORMANT: "沉睡病人",
  PACKAGE_FINISHED: "套組用完",
  NO_SHOW: "爽約 / 未補約",
  INCOMPLETE_PACKAGE: "套組未完成",
  OTHER: "其他",
};

export const OUTREACH_REASON_DESCRIPTIONS: Record<OutreachReason, string> = {
  DORMANT: "久未治療、無未來預約",
  PACKAGE_FINISHED: "預付套組已用完，未再購",
  NO_SHOW: "上次預約爽約或取消，未重新預約",
  INCOMPLETE_PACKAGE: "套組還有剩餘但久未使用",
  OTHER: "其他聯絡類型",
};
