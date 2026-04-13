"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions/follow-up-calls";

export interface FollowUpCallDefaults {
  symptomImprovement?: string;
  longTermPainImprovement?: number | null;
  educationDone?: boolean;
  appointmentConfirmed?: boolean;
  patientFeedback?: string;
  notes?: string;
}

interface FollowUpCallFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: FollowUpCallDefaults;
  cancelHref?: string;
  submitLabel?: string;
}

export function FollowUpCallForm({
  action,
  defaults,
  cancelHref = "/reminders",
  submitLabel = "儲存電訪紀錄",
}: FollowUpCallFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const errorMessage = state && state.ok === false ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Primary checkboxes — made prominent since they're the most common actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="group flex cursor-pointer items-center gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3 transition-colors has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50">
          <input
            type="checkbox"
            name="educationDone"
            defaultChecked={defaults?.educationDone ?? false}
            className="h-5 w-5 rounded border-neutral-300 accent-emerald-600"
          />
          <div>
            <div className="text-sm font-medium text-neutral-900">衛教已完成</div>
            <div className="text-xs text-neutral-500">
              術後注意事項、復健動作已說明
            </div>
          </div>
        </label>

        <label className="group flex cursor-pointer items-center gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3 transition-colors has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50">
          <input
            type="checkbox"
            name="appointmentConfirmed"
            defaultChecked={defaults?.appointmentConfirmed ?? false}
            className="h-5 w-5 rounded border-neutral-300 accent-emerald-600"
          />
          <div>
            <div className="text-sm font-medium text-neutral-900">回診已確認</div>
            <div className="text-xs text-neutral-500">
              病人確認會依約前來（會自動更新排程狀態）
            </div>
          </div>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="symptomImprovement">症狀改善情形</Label>
          <Textarea
            id="symptomImprovement"
            name="symptomImprovement"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.symptomImprovement ?? ""}
            placeholder="例如：疼痛明顯減輕，走樓梯不痠；偶爾晨僵但比治療前好很多"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="longTermPainImprovement">追蹤疼痛分數 (0–10)</Label>
          <Input
            id="longTermPainImprovement"
            name="longTermPainImprovement"
            type="number"
            min={0}
            max={10}
            step={1}
            defaultValue={defaults?.longTermPainImprovement ?? ""}
            placeholder="選填，電訪時病人自覺"
          />
          <p className="text-xs text-neutral-500">
            如果病人不清楚或你沒問，可留空。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="patientFeedback">病人回報事項</Label>
          <Textarea
            id="patientFeedback"
            name="patientFeedback"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.patientFeedback ?? ""}
            placeholder="病人主動提到的狀況、疑問、副作用、對下次治療的期待等"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="notes">備註</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            maxLength={2000}
            defaultValue={defaults?.notes ?? ""}
            placeholder="留給醫師參考的事項、需要特別注意的地方"
          />
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "儲存中…" : submitLabel}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>取消</Link>
        </Button>
      </div>
    </form>
  );
}
