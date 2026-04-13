import type { AppointmentStatus } from "@prisma/client";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "已排程",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  NO_SHOW: "未到",
  CANCELLED: "已取消",
};

export const APPOINTMENT_STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  COMPLETED: "bg-neutral-100 text-neutral-600 ring-neutral-400/30",
  NO_SHOW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20",
};

export function statusIsDone(status: AppointmentStatus): boolean {
  return status === "COMPLETED" || status === "NO_SHOW" || status === "CANCELLED";
}
