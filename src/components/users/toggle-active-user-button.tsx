"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toggleUserActive } from "@/server/actions/users";

interface ToggleActiveUserButtonProps {
  userId: string;
  active: boolean;
  userName: string;
  isSelf: boolean;
}

export function ToggleActiveUserButton({
  userId,
  active,
  userName,
  isSelf,
}: ToggleActiveUserButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return (
      <p className="text-xs text-neutral-500">無法停用自己的帳號</p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={active ? "outline" : "default"}
        disabled={pending}
        onClick={() => {
          if (active) {
            if (
              !confirm(
                `確定要停用「${userName}」的帳號嗎？\n\n停用後此使用者將無法登入系統，但所有歷史資料（治療紀錄等）完整保留，需要時可再次啟用。`,
              )
            ) {
              return;
            }
          }
          setError(null);
          startTransition(async () => {
            const result = await toggleUserActive(userId);
            if (result && result.ok === false) {
              setError(result.error);
            }
          });
        }}
      >
        {pending ? "處理中…" : active ? "停用帳號" : "重新啟用"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
