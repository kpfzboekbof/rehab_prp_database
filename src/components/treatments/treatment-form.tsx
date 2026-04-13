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
  packageSize: number | null;
}

/**
 * Per-package balance for the currently-viewed patient. Passed in by the
 * page so the form can show "you have X vials remaining" and validate
 * the USE / PURCHASE choice client-side.
 */
export interface PackageBalanceForForm {
  productId: string;
  remaining: number;
  totalPurchased: number;
  totalUsed: number;
}

export interface TreatmentFormDefaults {
  treatmentDate?: string; // YYYY-MM-DD
  bodyPart?: BodyPart;
  bodyPartDetail?: string;
  symptoms?: string;
  painBefore?: number;
  productId?: string;
  vialsUsed?: number;
  /** When editing an existing treatment, fix the package mode to its current value. */
  packageMode?: "USE" | "PURCHASE";
  ultrasoundNote?: string;
  physicianNote?: string;
}

interface TreatmentFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  products: ProductOption[];
  packageBalances: PackageBalanceForForm[];
  defaults?: TreatmentFormDefaults;
  submitLabel?: string;
  cancelHref: string;
  /** When true, the package mode is fixed to defaults.packageMode and not user-changeable. */
  lockPackageMode?: boolean;
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
  packageBalances,
  defaults,
  submitLabel = "儲存治療紀錄",
  cancelHref,
  lockPackageMode = false,
}: TreatmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  const [productId, setProductId] = useState<string>(
    defaults?.productId ?? products[0]?.id ?? "",
  );
  const [vialsUsed, setVialsUsed] = useState<number>(defaults?.vialsUsed ?? 1);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const isPackage = selectedProduct?.packageSize != null;

  const balance = useMemo(
    () => packageBalances.find((b) => b.productId === productId),
    [packageBalances, productId],
  );
  const remaining = balance?.remaining ?? 0;

  // Package mode selection. If editing, the parent locks this and we
  // honor whatever defaults.packageMode says. Otherwise:
  //   - If the patient has remaining vials of this package → default USE
  //   - Otherwise (no balance) → must PURCHASE
  const initialMode: "USE" | "PURCHASE" =
    defaults?.packageMode ?? (remaining > 0 ? "USE" : "PURCHASE");
  const [packageMode, setPackageMode] = useState<"USE" | "PURCHASE">(initialMode);

  // When user switches product, recompute mode default.
  function handleProductChange(nextId: string) {
    setProductId(nextId);
    if (lockPackageMode) return;
    const nextProduct = products.find((p) => p.id === nextId);
    const nextBalance = packageBalances.find((b) => b.productId === nextId);
    if (nextProduct?.packageSize != null) {
      setPackageMode((nextBalance?.remaining ?? 0) > 0 ? "USE" : "PURCHASE");
    }
  }

  // Live preview total for display only (server snapshots its own values).
  // unitPrice for a package IS the total package price (not per-vial),
  // so on PURCHASE we use it as-is. For regular products it's per-vial.
  let previewTotal = 0;
  if (selectedProduct) {
    if (!isPackage) {
      previewTotal = selectedProduct.unitPrice * Math.max(0, vialsUsed || 0);
    } else if (packageMode === "PURCHASE") {
      previewTotal = selectedProduct.unitPrice;
    } else {
      previewTotal = 0; // USE: already paid
    }
  }

  // Validation hints — purely client-side for UX, server re-validates.
  let vialsHint: string | null = null;
  let vialsError: string | null = null;
  if (isPackage && selectedProduct?.packageSize != null) {
    if (packageMode === "PURCHASE") {
      vialsHint = `本次最多可注射 ${selectedProduct.packageSize} 瓶（套組總瓶數）`;
      if (vialsUsed > selectedProduct.packageSize) {
        vialsError = `不可超過套組總瓶數 ${selectedProduct.packageSize}`;
      }
    } else {
      vialsHint = `此病人目前剩餘 ${remaining} 瓶`;
      if (vialsUsed > remaining) {
        vialsError = `剩餘瓶數不足（${remaining}）`;
      }
    }
  }

  const errorMessage =
    (state && state.ok === false ? state.error : null) ?? vialsError;

  const selectClass =
    "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-50";

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
          <Label htmlFor="symptoms">症狀</Label>
          <Textarea
            id="symptoms"
            name="symptoms"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.symptoms ?? ""}
            placeholder="主訴、病史、臨床發現（選填）"
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

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="productId">
            PRP 品項 <span className="text-red-600">*</span>
          </Label>
          <select
            id="productId"
            name="productId"
            required
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              請選擇
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.packageSize != null
                  ? `（套組 ${p.packageSize} 瓶 · 整套 ${formatTWD(p.unitPrice)}）`
                  : `（${formatTWD(p.unitPrice)} / 瓶）`}
              </option>
            ))}
          </select>
        </div>

        {/* Package mode block — shown only for package products */}
        {isPackage && selectedProduct?.packageSize != null && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-3">
              <div className="text-sm font-medium text-purple-900">
                預付套組品項
              </div>
              <div className="mt-1 text-sm text-purple-800">
                此病人目前 <strong>{selectedProduct.name}</strong> 剩餘{" "}
                <strong>{remaining}</strong> 瓶
                {balance && balance.totalPurchased > 0 && (
                  <span className="ml-1 text-xs text-purple-700">
                    （累計購入 {balance.totalPurchased}、已使用 {balance.totalUsed}）
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <label
                  className={
                    "flex items-center gap-2 text-sm " +
                    (lockPackageMode || remaining <= 0
                      ? "cursor-not-allowed text-purple-400"
                      : "cursor-pointer text-purple-900")
                  }
                >
                  <input
                    type="radio"
                    name="packageMode"
                    value="USE"
                    checked={packageMode === "USE"}
                    onChange={() => !lockPackageMode && setPackageMode("USE")}
                    disabled={lockPackageMode || remaining <= 0}
                  />
                  使用現有套組（不重複收費）
                </label>

                <label
                  className={
                    "flex items-center gap-2 text-sm " +
                    (lockPackageMode
                      ? "cursor-not-allowed text-purple-400"
                      : "cursor-pointer text-purple-900")
                  }
                >
                  <input
                    type="radio"
                    name="packageMode"
                    value="PURCHASE"
                    checked={packageMode === "PURCHASE"}
                    onChange={() => !lockPackageMode && setPackageMode("PURCHASE")}
                    disabled={lockPackageMode}
                  />
                  購入新套組（{selectedProduct.packageSize} 瓶 ·{" "}
                  {formatTWD(selectedProduct.unitPrice)}）
                </label>

                {lockPackageMode && (
                  <p className="text-xs text-purple-700">
                    編輯模式無法切換套組類型，需要修正請刪除後重新建立。
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="vialsUsed">
            本次注射瓶數 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="vialsUsed"
            name="vialsUsed"
            type="number"
            min={1}
            max={isPackage ? selectedProduct?.packageSize ?? 100 : 100}
            step={1}
            required
            value={Number.isFinite(vialsUsed) ? vialsUsed : ""}
            onChange={(e) =>
              setVialsUsed(Number.parseInt(e.target.value, 10) || 0)
            }
          />
          {vialsHint && (
            <p
              className={
                "text-xs " + (vialsError ? "text-red-600" : "text-neutral-500")
              }
            >
              {vialsHint}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-xs text-neutral-500">本次收費</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-900">
              {formatTWD(previewTotal)}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {isPackage
                ? packageMode === "PURCHASE"
                  ? `購入新套組：${selectedProduct?.packageSize} 瓶整套 ${formatTWD(selectedProduct?.unitPrice ?? 0)}`
                  : "使用現有套組，本次不重複收費"
                : "依品項單價 × 瓶數計算"}
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
        <Button type="submit" disabled={pending || !!vialsError}>
          {pending ? "儲存中…" : submitLabel}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>取消</Link>
        </Button>
      </div>
    </form>
  );
}
