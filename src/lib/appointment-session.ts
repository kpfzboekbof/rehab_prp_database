import type { AppointmentSession } from "@prisma/client";

export const APPOINTMENT_SESSION_LABELS: Record<AppointmentSession, string> = {
  MORNING: "早診",
  AFTERNOON: "午診",
  EVENING: "晚診",
};

export const APPOINTMENT_SESSION_OPTIONS: Array<{
  value: AppointmentSession;
  label: string;
  hint: string;
}> = [
  { value: "MORNING", label: "早診", hint: "上午看診" },
  { value: "AFTERNOON", label: "午診", hint: "下午看診" },
  { value: "EVENING", label: "晚診", hint: "晚上看診" },
];
