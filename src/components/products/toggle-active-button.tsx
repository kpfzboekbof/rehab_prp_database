"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toggleProductActive } from "@/server/actions/products";

interface ToggleActiveButtonProps {
  id: string;
  active: boolean;
  usageCount: number;
}

export function ToggleActiveButton({ id, active, usageCount }: ToggleActiveButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={active ? "outline" : "default"}
      disabled={pending}
      onClick={() => {
        if (active) {
          const confirmMsg =
            usageCount > 0
              ? `確定要停用這個品項嗎？\n\n此品項已用於 ${usageCount} 筆治療紀錄。停用後：\n- 新建的治療紀錄將無法選擇此品項\n- 既有紀錄保留不變\n- 需要時可再次啟用`
              : "確定要停用這個品項嗎？停用後新建治療紀錄無法選擇此品項，需要時可再次啟用。";
          if (!confirm(confirmMsg)) return;
        }
        startTransition(async () => {
          await toggleProductActive(id);
        });
      }}
    >
      {pending ? "處理中…" : active ? "停用品項" : "重新啟用"}
    </Button>
  );
}
