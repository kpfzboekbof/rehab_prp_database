import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";

import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { AppointmentStatusButtons } from "@/components/calendar/appointment-status-buttons";
import { Button } from "@/components/ui/button";
import { formatDateTW, formatTimeTW } from "@/lib/date";

export interface DayAppointment {
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
  followUpCall: { id: string } | null;
}

interface DayPanelProps {
  date: string; // YYYY-MM-DD
  appointments: DayAppointment[];
}

export function DayPanel({ date, appointments }: DayPanelProps) {
  // Build a Date for display purposes only (noon Taipei to avoid DST edges).
  const [y, m, d] = date.split("-").map(Number);
  const displayDate = new Date(Date.UTC(y, m - 1, d, 4, 0, 0));

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">{formatDateTW(displayDate)}</h2>
          <p className="text-sm text-neutral-600">
            當日共 {appointments.length} 筆回診
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/calendar/new?date=${date}`}>新增當日回診</Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500">
          這一天沒有回診排程
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {appointments.map((a) => (
            <li key={a.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      {formatTimeTW(a.scheduledAt)}
                    </span>
                    <Link
                      href={`/patients/${a.patient.id}`}
                      className="text-sm font-medium text-neutral-900 hover:underline"
                    >
                      {a.patient.name}
                    </Link>
                    <span className="font-mono text-xs text-neutral-500">
                      {a.patient.chartNumber}
                    </span>
                    <AppointmentStatusBadge status={a.status} />
                  </div>
                  {a.patient.phone && (
                    <div className="mt-1 text-xs text-neutral-500">
                      電話：{a.patient.phone}
                    </div>
                  )}
                  {a.reason && (
                    <div className="mt-1 text-sm text-neutral-700">{a.reason}</div>
                  )}
                </div>
                <Link
                  href={`/calendar/${a.id}/edit`}
                  className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                >
                  編輯
                </Link>
              </div>
              <div className="mt-3">
                <AppointmentStatusButtons id={a.id} current={a.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
