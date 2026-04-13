import Link from "next/link";
import type { AppointmentStatus, FollowUpCall, User } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { BODY_PART_LABELS } from "@/lib/body-parts";
import { formatDateTimeTW, formatDateTW, formatTimeTW, taipeiDateKey } from "@/lib/date";

interface ReminderRow {
  id: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  reason: string | null;
  patient: {
    id: string;
    name: string;
    chartNumber: string;
    phone: string | null;
  };
  sourceTreatment: {
    id: string;
    treatmentDate: Date;
    bodyPart: keyof typeof BODY_PART_LABELS;
    bodyPartDetail: string | null;
    product: { name: string };
  } | null;
  followUpCall:
    | (FollowUpCall & { calledBy: Pick<User, "id" | "name"> })
    | null;
}

interface ReminderCardProps {
  row: ReminderRow;
}

/**
 * Human-friendly relative date label for a scheduled appointment.
 * Returns strings like "今天 / 明天 / 3 天後 / 已過期 2 天".
 */
function relativeDayLabel(scheduledAt: Date): { label: string; tone: "ok" | "soon" | "overdue" } {
  const todayKey = taipeiDateKey(new Date());
  const apptKey = taipeiDateKey(scheduledAt);
  if (apptKey === todayKey) return { label: "今天", tone: "soon" };

  // Compute day difference using Taipei dates
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const [ay, am, ad] = apptKey.split("-").map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  const appt = Date.UTC(ay, am - 1, ad);
  const diffDays = Math.round((appt - today) / (24 * 60 * 60 * 1000));

  if (diffDays === 1) return { label: "明天", tone: "soon" };
  if (diffDays > 1 && diffDays <= 3) return { label: `${diffDays} 天後`, tone: "soon" };
  if (diffDays > 3) return { label: `${diffDays} 天後`, tone: "ok" };
  if (diffDays === -1) return { label: "昨天（已過期）", tone: "overdue" };
  return { label: `已過期 ${Math.abs(diffDays)} 天`, tone: "overdue" };
}

const TONE_CLASSES = {
  ok: "bg-neutral-100 text-neutral-600 ring-neutral-400/30",
  soon: "bg-amber-50 text-amber-700 ring-amber-600/20",
  overdue: "bg-red-50 text-red-700 ring-red-600/20",
} as const;

export function ReminderCard({ row }: ReminderCardProps) {
  const already = row.followUpCall !== null;
  const rel = relativeDayLabel(row.scheduledAt);

  return (
    <div
      className={
        "rounded-md border bg-white p-4 " +
        (already ? "border-neutral-200" : "border-neutral-200 shadow-sm")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: patient + schedule info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-medium text-neutral-900">
              {row.patient.name}
            </span>
            <span className="font-mono text-xs text-neutral-500">
              {row.patient.chartNumber}
            </span>
            <AppointmentStatusBadge status={row.status} size="sm" />
            {already && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                ✓ 已電訪
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-neutral-900">
              {formatDateTW(row.scheduledAt)} {formatTimeTW(row.scheduledAt)}
            </span>
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset " +
                TONE_CLASSES[rel.tone]
              }
            >
              {rel.label}
            </span>
          </div>

          {row.patient.phone && (
            <div className="mt-1 text-sm text-neutral-600">
              ☎ <span className="font-mono">{row.patient.phone}</span>
            </div>
          )}

          {row.reason && (
            <div className="mt-1 text-sm text-neutral-600">{row.reason}</div>
          )}

          {row.sourceTreatment && (
            <div className="mt-1 text-xs text-neutral-500">
              來源治療：{formatDateTW(row.sourceTreatment.treatmentDate)} ·{" "}
              {BODY_PART_LABELS[row.sourceTreatment.bodyPart]} ·{" "}
              {row.sourceTreatment.product.name}
            </div>
          )}

          {/* Already-called summary */}
          {already && row.followUpCall && (
            <div className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              <div>
                電訪時間：{formatDateTimeTW(row.followUpCall.calledAt)} ·{" "}
                {row.followUpCall.calledBy.name}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {row.followUpCall.educationDone && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    ✓ 衛教
                  </span>
                )}
                {row.followUpCall.appointmentConfirmed && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    ✓ 回診確認
                  </span>
                )}
                {row.followUpCall.longTermPainImprovement !== null && (
                  <span className="text-[11px] text-neutral-600">
                    疼痛 {row.followUpCall.longTermPainImprovement}/10
                  </span>
                )}
              </div>
              {row.followUpCall.patientFeedback && (
                <div className="mt-1 text-[11px] text-neutral-600">
                  病人回報：{row.followUpCall.patientFeedback}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: action button */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {already ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/reminders/${row.id}/call`}>編輯電訪紀錄</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={`/reminders/${row.id}/call`}>開始電訪</Link>
            </Button>
          )}
          <Link
            href={`/patients/${row.patient.id}`}
            className="text-xs text-neutral-500 underline-offset-4 hover:underline"
          >
            病人詳情
          </Link>
        </div>
      </div>
    </div>
  );
}
