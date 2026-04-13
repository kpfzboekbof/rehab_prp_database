"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteCommissionRate } from "@/server/actions/commission";

interface DeleteRateButtonProps {
  rateId: string;
  doctorName: string;
  ratePercent: number;
}

export function DeleteRateButton({ rateId, doctorName, ratePercent }: DeleteRateButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `確定要刪除「${doctorName}」目前的 ${ratePercent}% 抽成規則嗎？\n\n` +
                "如果有前一筆規則，系統會自動把它重新開放（effectiveTo 設回 null）。\n" +
                "既有治療紀錄的 snapshot 不會受影響。",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteCommissionRate(rateId);
            if (result && result.ok === false) {
              setError(result.error);
            }
          });
        }}
      >
        {pending ? "刪除中…" : "刪除"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
