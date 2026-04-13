import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { FollowUpCallForm } from "@/components/reminders/follow-up-call-form";
import { BODY_PART_LABELS } from "@/lib/body-parts";
import {
  ageAt,
  formatDateTW,
  formatDateTimeTW,
  formatTimeTW,
} from "@/lib/date";
import { recordFollowUpCall } from "@/server/actions/follow-up-calls";
import { getAppointmentForCall } from "@/server/queries/reminders";
import { requireRole } from "@/server/rbac";

interface CallPageProps {
  params: Promise<{ appointmentId: string }>;
}

const GENDER_LABELS = {
  MALE: "男",
  FEMALE: "女",
  OTHER: "其他",
} as const;

export default async function FollowUpCallPage({ params }: CallPageProps) {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);
  const { appointmentId } = await params;

  const appointment = await getAppointmentForCall(appointmentId);
  if (!appointment) notFound();

  const action = recordFollowUpCall.bind(null, appointmentId);
  const existingCall = appointment.followUpCall;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/reminders" className="underline-offset-4 hover:underline">
          回診提醒
        </Link>
        <span className="mx-2">/</span>
        <span>{existingCall ? "編輯電訪紀錄" : "電訪紀錄"}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>病人資訊</CardTitle>
          <CardDescription>電訪前請先確認下列資訊</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">姓名</dt>
              <dd className="mt-1 font-medium">
                <Link
                  href={`/patients/${appointment.patient.id}`}
                  className="text-neutral-900 underline-offset-4 hover:underline"
                >
                  {appointment.patient.name}
                </Link>
                <span className="ml-2 text-xs text-neutral-500">
                  {GENDER_LABELS[appointment.patient.gender]} ·{" "}
                  {ageAt(appointment.patient.birthDate)} 歲
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">病歷號</dt>
              <dd className="mt-1 font-mono font-medium">
                {appointment.patient.chartNumber}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">電話</dt>
              <dd className="mt-1 font-mono font-medium text-lg">
                {appointment.patient.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">預約時間</dt>
              <dd className="mt-1 font-medium">
                {formatDateTW(appointment.scheduledAt)}{" "}
                {formatTimeTW(appointment.scheduledAt)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">排程狀態</dt>
              <dd className="mt-1">
                <AppointmentStatusBadge status={appointment.status} />
                {appointment.reason && (
                  <span className="ml-2 text-sm text-neutral-600">
                    · {appointment.reason}
                  </span>
                )}
              </dd>
            </div>
            {appointment.sourceTreatment && (
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">來源治療紀錄</dt>
                <dd className="mt-1 text-sm text-neutral-700">
                  {formatDateTW(appointment.sourceTreatment.treatmentDate)} ·{" "}
                  {BODY_PART_LABELS[appointment.sourceTreatment.bodyPart]}
                  {appointment.sourceTreatment.bodyPartDetail &&
                    ` · ${appointment.sourceTreatment.bodyPartDetail}`}
                  {" · "}
                  {appointment.sourceTreatment.product.name}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{existingCall ? "編輯電訪紀錄" : "電訪紀錄"}</CardTitle>
          <CardDescription>
            {existingCall
              ? `原紀錄於 ${formatDateTimeTW(existingCall.calledAt)} 由 ${existingCall.calledBy.name} 建立`
              : "完成電訪後勾選下列項目並填寫內容"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FollowUpCallForm
            action={action}
            cancelHref="/reminders"
            submitLabel={existingCall ? "儲存變更" : "儲存電訪紀錄"}
            defaults={
              existingCall
                ? {
                    symptomImprovement: existingCall.symptomImprovement ?? "",
                    longTermPainImprovement: existingCall.longTermPainImprovement,
                    educationDone: existingCall.educationDone,
                    appointmentConfirmed: existingCall.appointmentConfirmed,
                    patientFeedback: existingCall.patientFeedback ?? "",
                    notes: existingCall.notes ?? "",
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
