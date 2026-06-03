"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions/commission";

export interface DoctorOption {
  id: string;
  name: string;
  email: string;
  role: "DOCTOR" | "ADMIN";
}

export interface CommissionFormDefaults {
  doctorId?: string;
  ratePercent?: number;
  effectiveFrom?: string; // YYYY-MM-DD
  note?: string;
}

interface CommissionFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  doctors: DoctorOption[];
  defaults?: CommissionFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
}

function todayInTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function CommissionForm({
  action,
  doctors,
  defaults,
  submitLabel = "新增抽成規則",
  cancelHref = "/admin/commission",
}: CommissionFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  const errorMessage = state && state.ok === false ? state.error : null;

  const selectClass =
    "flex h-11 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-base sm:h-10 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="doctorId">
            醫師 <span className="text-red-600">*</span>
          </Label>
          <select
            id="doctorId"
            name="doctorId"
            required
            defaultValue={defaults?.doctorId ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              請選擇
            </option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}（{d.role === "ADMIN" ? "管理員 / 醫師" : "醫師"} · {d.email}）
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ratePercent">
            抽成比例 (%) <span className="text-red-600">*</span>
          </Label>
          <Input
            id="ratePercent"
            name="ratePercent"
            type="number"
            min={0}
            max={100}
            step={0.5}
            required
            defaultValue={defaults?.ratePercent ?? ""}
            placeholder="例如 35"
          />
          <p className="text-xs text-neutral-500">
            直接輸入百分比，例如 35 代表 35%。
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="effectiveFrom">
            生效日 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            required
            defaultValue={defaults?.effectiveFrom ?? todayInTaipei()}
          />
          <p className="text-xs text-neutral-500">
            自此日起（含當日）生效，先前的規則會自動關閉於此日。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            maxLength={500}
            defaultValue={defaults?.note ?? ""}
            placeholder="例如 2026 合約續約調整、試用期滿調升等"
          />
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <strong>提醒：</strong>
        新增後，該醫師目前有效的抽成規則會自動設定 effectiveTo 為本次生效日。
        既有治療紀錄的抽成金額已於建立時 snapshot，不會被追溯調整。
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
