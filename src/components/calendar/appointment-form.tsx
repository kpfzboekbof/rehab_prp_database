"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AppointmentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/appointment-status";
import type { ActionState } from "@/server/actions/appointments";

export interface PatientOption {
  id: string;
  name: string;
  chartNumber: string;
}

export interface AppointmentFormDefaults {
  patientId?: string;
  scheduledAt?: string; // YYYY-MM-DDTHH:mm
  status?: AppointmentStatus;
  reason?: string;
  sourceTreatmentId?: string;
}

interface AppointmentFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  patients: PatientOption[];
  /** If provided, locks the patient selector to this patient (e.g. when scheduling from a patient page). */
  lockedPatientId?: string;
  defaults?: AppointmentFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
  /** When true, shows the status selector. Hidden on create (always SCHEDULED); shown on edit. */
  showStatus?: boolean;
}

const STATUS_OPTIONS: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

export function AppointmentForm({
  action,
  patients,
  lockedPatientId,
  defaults,
  submitLabel = "儲存",
  cancelHref = "/calendar",
  showStatus = false,
}: AppointmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const errorMessage = state && state.ok === false ? state.error : null;

  const selectClass =
    "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-50";

  const effectivePatientId = lockedPatientId ?? defaults?.patientId ?? "";
  const lockedPatient =
    lockedPatientId != null
      ? patients.find((p) => p.id === lockedPatientId)
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="patientId">
            病人 <span className="text-red-600">*</span>
          </Label>
          {lockedPatient ? (
            <>
              <div className="flex h-10 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700">
                {lockedPatient.name}（
                <span className="font-mono">{lockedPatient.chartNumber}</span>）
              </div>
              <input type="hidden" name="patientId" value={lockedPatient.id} />
            </>
          ) : (
            <select
              id="patientId"
              name="patientId"
              required
              defaultValue={effectivePatientId}
              className={selectClass}
            >
              <option value="" disabled>
                請選擇
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.chartNumber}）
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduledAt">
            回診時間 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            required
            defaultValue={defaults?.scheduledAt ?? ""}
          />
          <p className="text-xs text-neutral-500">時區為台北（UTC+8）。</p>
        </div>

        {showStatus && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">狀態</Label>
            <select
              id="status"
              name="status"
              defaultValue={defaults?.status ?? "SCHEDULED"}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="reason">備註 / 回診目的</Label>
          <Textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={500}
            defaultValue={defaults?.reason ?? ""}
            placeholder="例如 PRP 追蹤、拆線、復健評估"
          />
        </div>

        {defaults?.sourceTreatmentId && (
          <input
            type="hidden"
            name="sourceTreatmentId"
            value={defaults.sourceTreatmentId}
          />
        )}
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
