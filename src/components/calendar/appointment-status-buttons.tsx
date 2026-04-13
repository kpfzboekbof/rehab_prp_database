"use client";

import { useState, useTransition } from "react";
import type { AppointmentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { updateAppointmentStatus } from "@/server/actions/appointments";

interface AppointmentStatusButtonsProps {
  id: string;
  current: AppointmentStatus;
}

/**
 * Quick status-change buttons for the calendar day panel. Each button
 * calls `updateAppointmentStatus` server action with a transition so the
 * UI stays responsive. Buttons for the current status are hidden.
 */
export function AppointmentStatusButtons({ id, current }: AppointmentStatusButtonsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(next: AppointmentStatus, confirmMessage?: string) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, next);
      if (result && result.ok === false) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {current !== "CONFIRMED" && current !== "COMPLETED" && current !== "NO_SHOW" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => update("CONFIRMED")}
        >
          標記已確認
        </Button>
      )}
      {current !== "COMPLETED" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => update("COMPLETED")}
        >
          標記已完成
        </Button>
      )}
      {current !== "NO_SHOW" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => update("NO_SHOW")}
        >
          標記未到
        </Button>
      )}
      {current !== "CANCELLED" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => update("CANCELLED", "確定要取消這筆回診預約嗎？")}
        >
          取消預約
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
