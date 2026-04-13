import type { AppointmentStatus } from "@prisma/client";

import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/appointment-status";

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  size?: "sm" | "md";
}

export function AppointmentStatusBadge({ status, size = "md" }: AppointmentStatusBadgeProps) {
  const cls = APPOINTMENT_STATUS_BADGE_CLASSES[status];
  const sizeCls = size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${cls} ${sizeCls}`}
    >
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}
