"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteAppointment } from "@/server/actions/appointments";

interface DeleteAppointmentButtonProps {
  id: string;
  patientName: string;
  dateLabel: string;
  sessionLabel: string;
}

/**
 * Destructive action button used on the appointment edit page. Unlike
 * patient deletion (soft-delete for 7-year retention), appointments
 * are hard-deleted — they're scheduling state, not medical records.
 * The confirm dialog includes the patient / date / session so the
 * user can sanity-check which appointment they're removing.
 */
export function DeleteAppointmentButton({
  id,
  patientName,
  dateLabel,
  sessionLabel,
}: DeleteAppointmentButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        const ok = confirm(
          `確定要刪除這筆回診排程嗎？\n\n` +
            `病人：${patientName}\n` +
            `日期：${dateLabel} ${sessionLabel}\n\n` +
            `此操作無法復原。如果只是想取消該次回診，建議改用「狀態」改成「已取消」而不是刪除。`,
        );
        if (!ok) return;
        startTransition(async () => {
          await deleteAppointment(id);
        });
      }}
    >
      {pending ? "刪除中…" : "刪除此排程"}
    </Button>
  );
}
