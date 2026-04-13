"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Gender } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions/patients";

export interface PatientFormDefaults {
  chartNumber?: string;
  name?: string;
  gender?: Gender;
  age?: number;
  phone?: string;
  address?: string;
  notes?: string;
}

interface PatientFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: PatientFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
}

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "MALE", label: "男" },
  { value: "FEMALE", label: "女" },
  { value: "OTHER", label: "其他" },
];

export function PatientForm({
  action,
  defaults,
  submitLabel = "儲存",
  cancelHref = "/patients",
}: PatientFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  const errorMessage =
    state && state.ok === false ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="chartNumber">
            病歷號 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="chartNumber"
            name="chartNumber"
            required
            maxLength={50}
            defaultValue={defaults?.chartNumber ?? ""}
            placeholder="例如 A12345"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            姓名 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={defaults?.name ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">
            性別 <span className="text-red-600">*</span>
          </Label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue={defaults?.gender ?? ""}
            className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          >
            <option value="" disabled>
              請選擇
            </option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="age">
            年齡 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="age"
            name="age"
            type="number"
            min={0}
            max={120}
            step={1}
            required
            defaultValue={defaults?.age ?? ""}
            placeholder="例如 65"
          />
          <p className="text-xs text-neutral-500">
            以「歲」為單位。系統會自動每年遞增。
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">電話</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            maxLength={20}
            defaultValue={defaults?.phone ?? ""}
            placeholder="09xxxxxxxx"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="address">地址</Label>
          <Input
            id="address"
            name="address"
            maxLength={200}
            defaultValue={defaults?.address ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="notes">備註</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            maxLength={2000}
            defaultValue={defaults?.notes ?? ""}
            placeholder="病史、過敏、特殊注意事項等"
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
