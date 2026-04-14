"use client";

import { useState, useTransition } from "react";
import type { OutreachReason } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  markOutreachContacted,
  unmarkOutreachContacted,
} from "@/server/actions/outreach";

interface MarkContactedButtonProps {
  patientId: string;
  reason: OutreachReason;
}

/**
 * Inline "mark as contacted" button with an optional outcome note.
 * Collapsed state shows a single button; when opened, expands to a
 * text input + save/cancel. Uses useTransition so the list refreshes
 * without full page reload after the server action.
 */
export function MarkContactedButton({
  patientId,
  reason,
}: MarkContactedButtonProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={() => setOpen(true)}
      >
        標記已聯絡
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="通話結果（例：已預約、考慮中、拒絕、不通…）"
        className="sm:min-w-[260px]"
        autoFocus
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await markOutreachContacted(patientId, reason, notes || null);
              setOpen(false);
              setNotes("");
            });
          }}
        >
          {pending ? "儲存中…" : "儲存"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setNotes("");
          }}
        >
          取消
        </Button>
      </div>
    </div>
  );
}

interface UnmarkContactedButtonProps {
  contactId: string;
}

export function UnmarkContactedButton({ contactId }: UnmarkContactedButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("確定要取消這筆聯絡紀錄嗎？")) return;
        startTransition(async () => {
          await unmarkOutreachContacted(contactId);
        });
      }}
    >
      {pending ? "處理中…" : "取消紀錄"}
    </Button>
  );
}
