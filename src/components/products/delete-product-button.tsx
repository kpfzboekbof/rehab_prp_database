"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/server/actions/products";

interface DeleteProductButtonProps {
  id: string;
  name: string;
  canDelete: boolean;
  usageCount: number;
}

export function DeleteProductButton({
  id,
  name,
  canDelete,
  usageCount,
}: DeleteProductButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canDelete) {
    return (
      <div className="flex items-center gap-3">
        <Button type="button" variant="destructive" disabled>
          刪除品項
        </Button>
        <span className="text-xs text-neutral-500">
          此品項已被 {usageCount} 筆治療紀錄使用，無法刪除；請改用「停用」。
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `確定要永久刪除品項「${name}」嗎？\n\n此品項尚未被任何治療紀錄使用，刪除後無法復原。`,
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteProduct(id);
            if (result && result.ok === false) {
              setError(result.error);
            }
          });
        }}
      >
        {pending ? "刪除中…" : "刪除品項"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
