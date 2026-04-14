import Link from "next/link";
import type { OutreachReason } from "@prisma/client";

import { MarkContactedButton, UnmarkContactedButton } from "@/components/outreach/mark-contacted-button";
import { ageAt, formatDateTimeTW, formatDateTW } from "@/lib/date";
import type { OutreachContactWithUser, OutreachPatientSummary } from "@/server/queries/outreach";

interface OutreachPatientCardProps {
  patient: OutreachPatientSummary;
  reason: OutreachReason;
  /** Left-side big headline (e.g., "已沉睡 120 天"). */
  headline: string;
  /** Right-side supplementary info lines (key-value pairs). */
  metrics: Array<{ label: string; value: string }>;
  /** Optional free-text footer describing the last event. */
  footer?: string;
}

const GENDER_LABELS = {
  MALE: "男",
  FEMALE: "女",
  OTHER: "其他",
} as const;

function tone(contact: OutreachContactWithUser | null): "open" | "contacted" {
  if (!contact) return "open";
  // If the contact was logged within the last 60 days, treat the row
  // as "已聯絡" and dim it. Older than that, it's effectively stale and
  // we treat the row as open again.
  const ageDays =
    (Date.now() - contact.contactedAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= 60 ? "contacted" : "open";
}

export function OutreachPatientCard({
  patient,
  reason,
  headline,
  metrics,
  footer,
}: OutreachPatientCardProps) {
  const state = tone(patient.recentContact);
  const isContacted = state === "contacted";

  return (
    <div
      className={
        "rounded-md border bg-white p-4 transition-colors " +
        (isContacted
          ? "border-neutral-200 bg-neutral-50/60"
          : "border-neutral-200 shadow-sm")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/patients/${patient.id}`}
              className="text-lg font-medium text-neutral-900 hover:underline"
            >
              {patient.name}
            </Link>
            <span className="font-mono text-xs text-neutral-500">
              {patient.chartNumber}
            </span>
            <span className="text-xs text-neutral-500">
              {ageAt(patient.birthDate)} 歲 / {GENDER_LABELS[patient.gender]}
            </span>
            {isContacted && (
              <span className="inline-flex items-center rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
                已聯絡
              </span>
            )}
          </div>

          {patient.phone ? (
            <div className="mt-1 font-mono text-base text-[#ED6D3D]">
              ☎ {patient.phone}
            </div>
          ) : (
            <div className="mt-1 text-xs text-neutral-400">（無電話）</div>
          )}

          <div className="mt-2 text-sm font-medium text-neutral-700">
            {headline}
          </div>

          {footer && (
            <div className="mt-1 text-xs text-neutral-500">{footer}</div>
          )}

          {patient.recentContact && (
            <div className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
              <div>
                {formatDateTimeTW(patient.recentContact.contactedAt)} ·{" "}
                {patient.recentContact.contactedBy.name}
                {patient.recentContact.notes &&
                  ` · ${patient.recentContact.notes}`}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">
                {m.label}
              </div>
              <div className="text-sm font-medium text-neutral-800">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isContacted && patient.recentContact ? (
          <UnmarkContactedButton contactId={patient.recentContact.id} />
        ) : (
          <MarkContactedButton patientId={patient.id} reason={reason} />
        )}
        <Link
          href={`/patients/${patient.id}`}
          className="text-xs text-neutral-500 underline-offset-4 hover:underline"
        >
          病人詳情
        </Link>
      </div>
    </div>
  );
}

/**
 * Helper used by pages — splits rows into "open" (not contacted
 * recently) and "contacted" (contacted within the last 60 days) groups.
 */
export function splitByContactState<T extends { patient: OutreachPatientSummary }>(
  rows: T[],
): { open: T[]; contacted: T[] } {
  const open: T[] = [];
  const contacted: T[] = [];
  for (const r of rows) {
    if (tone(r.patient.recentContact) === "contacted") {
      contacted.push(r);
    } else {
      open.push(r);
    }
  }
  return { open, contacted };
}

// Trivial re-export so pages don't need to import formatDateTW separately.
export { formatDateTW };
