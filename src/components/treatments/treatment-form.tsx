"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { BodyPart } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BODY_PART_OPTIONS } from "@/lib/body-parts";
import { formatTWD } from "@/lib/currency";
import type { ActionState } from "@/server/actions/treatments";

export interface ProductOption {
  id: string;
  name: string;
  unitPrice: number;
}

export interface TreatmentFormDefaults {
  treatmentDate?: string; // YYYY-MM-DD
  bodyPart?: BodyPart;
  bodyPartDetail?: string;
  symptoms?: string;
  painBefore?: number;
  painImmediateAfter?: number | null;
  productId?: string;
  quantity?: number;
  ultrasoundNote?: string;
  physicianNote?: string;
}

interface TreatmentFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  products: ProductOption[];
  defaults?: TreatmentFormDefaults;
  submitLabel?: string;
  cancelHref: string;
}

function todayInTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function TreatmentForm({
  action,
  products,
  defaults,
  submitLabel = "儲存治療紀錄",
  cancelHref,
}: TreatmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  // Local state for live total calculation
  const [productId, setProductId] = useState<string>(
    defaults?.productId ?? products[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState<number>(defaults?.quantity ?? 1);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const livePreviewTotal = (selectedProduct?.unitPrice ?? 0) * Math.max(0, quantity || 0);

  const errorMessage = state && state.ok === false ? state.error : null;

  const selectClass =
    "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="treatmentDate">
            治療日期 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="treatmentDate"
            name="treatmentDate"
            type="date"
            required
            defaultValue={defaults?.treatmentDate ?? todayInTaipei()}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bodyPart">
            部位 <span className="text-red-600">*</span>
          </Label>
          <select
            id="bodyPart"
            name="bodyPart"
            required
            defaultValue={defaults?.bodyPart ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              請選擇
            </option>
            {BODY_PART_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="bodyPartDetail">部位詳情</Label>
          <Input
            id="bodyPartDetail"
            name="bodyPartDetail"
            maxLength={200}
            defaultValue={defaults?.bodyPartDetail ?? ""}
            placeholder="例如 左側內側半月板 / 右肩旋轉肌群"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="symptoms">
            症狀 <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="symptoms"
            name="symptoms"
            required
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.symptoms ?? ""}
            placeholder="主訴、病史、臨床發現"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="painBefore">
            治療前疼痛 (0–10) <span className="text-red-600">*</span>
          </Label>
          <Input
            id="painBefore"
            name="painBefore"
            type="number"
            min={0}
            max={10}
            step={1}
            required
            defaultValue={defaults?.painBefore ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="painImmediateAfter">治療當天治療後疼痛 (0–10)</Label>
          <Input
            id="painImmediateAfter"
            name="painImmediateAfter"
            type="number"
            min={0}
            max={10}
            step={1}
            defaultValue={defaults?.painImmediateAfter ?? ""}
            placeholder="可留空，後續追蹤再填"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="productId">
            PRP 品項 <span className="text-red-600">*</span>
          </Label>
          <select
            id="productId"
            name="productId"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              請選擇
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{formatTWD(p.unitPrice)}）
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">
            數量 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={100}
            step={1}
            required
            value={Number.isFinite(quantity) ? quantity : ""}
            onChange={(e) => setQuantity(Number.parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-xs text-neutral-500">預估金額</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-900">
              {formatTWD(livePreviewTotal)}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              依選擇的品項單價 × 數量自動計算；實際儲存時會以當下品項單價 snapshot 為準。
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="ultrasoundNote">超音波導引註記</Label>
          <Textarea
            id="ultrasoundNote"
            name="ultrasoundNote"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.ultrasoundNote ?? ""}
            placeholder="超音波定位發現、注射路徑、影像重點等"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="physicianNote">醫師備註</Label>
          <Textarea
            id="physicianNote"
            name="physicianNote"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.physicianNote ?? ""}
            placeholder="術後衛教、下次追蹤計畫等"
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
