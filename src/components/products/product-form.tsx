"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions/products";

export interface ProductFormDefaults {
  name?: string;
  unitPrice?: number;
  packageSize?: number | null;
  notes?: string;
}

interface ProductFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: ProductFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
}

export function ProductForm({
  action,
  defaults,
  submitLabel = "儲存",
  cancelHref = "/admin/products",
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  const errorMessage = state && state.ok === false ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="name">
            品項名稱 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={defaults?.name ?? ""}
            placeholder="例如 Regen Lab BCT"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="unitPrice">
            單價 (NT$) <span className="text-red-600">*</span>
          </Label>
          <Input
            id="unitPrice"
            name="unitPrice"
            type="number"
            min={0}
            step={100}
            required
            defaultValue={defaults?.unitPrice ?? ""}
            placeholder="12000"
          />
          <p className="text-xs text-neutral-500">
            整數，單位新台幣。對套組品項而言是「每瓶」價格。
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="packageSize">預付套組瓶數</Label>
          <Input
            id="packageSize"
            name="packageSize"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults?.packageSize ?? ""}
            placeholder="留空 = 一般品項"
          />
          <p className="text-xs text-neutral-500">
            預付套組請填瓶數（例如 PLT 10 瓶套組填 10）。病人購入時一次付清 套組瓶數 × 單價；後續使用時不重複收費，系統會自動追蹤剩餘瓶數。留空代表一般品項（一次付清一次用完）。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="notes">備註</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={defaults?.notes ?? ""}
            placeholder="品項規格、廠商、供應商、適應症等"
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
