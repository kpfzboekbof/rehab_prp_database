import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeletePatientButton } from "@/components/patients/delete-patient-button";
import { TreatmentTable } from "@/components/treatments/treatment-table";
import { formatTWD } from "@/lib/currency";
import { ageAt, formatDateTW, formatDateTimeTW } from "@/lib/date";
import { getPatient } from "@/server/queries/patients";
import { listTreatmentsByPatient } from "@/server/queries/treatments";
import { requireSession } from "@/server/rbac";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

const GENDER_LABELS = {
  MALE: "男",
  FEMALE: "女",
  OTHER: "其他",
} as const;

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;

  const patient = await getPatient(id);
  if (!patient) {
    notFound();
  }

  const treatments = await listTreatmentsByPatient(patient.id);

  const canDelete = session.user.role === "DOCTOR" || session.user.role === "ADMIN";
  const canAddTreatment =
    session.user.role === "DOCTOR" || session.user.role === "ADMIN";

  const totalRevenue = treatments.reduce((sum, t) => sum + t.totalAmount, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/patients" className="underline-offset-4 hover:underline">
          病人管理
        </Link>
        <span className="mx-2">/</span>
        <span>{patient.name}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{patient.name}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            病歷號 <span className="font-mono">{patient.chartNumber}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/edit`}>編輯</Link>
          </Button>
          {canDelete && (
            <DeletePatientButton id={patient.id} name={patient.name} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本資料</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">性別</dt>
              <dd className="mt-1 font-medium">{GENDER_LABELS[patient.gender]}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">年齡</dt>
              <dd className="mt-1 font-medium">{ageAt(patient.birthDate)} 歲</dd>
            </div>
            <div>
              <dt className="text-neutral-500">生日</dt>
              <dd className="mt-1 font-medium">{formatDateTW(patient.birthDate)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">電話</dt>
              <dd className="mt-1 font-medium">{patient.phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">地址</dt>
              <dd className="mt-1 font-medium">{patient.address || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">備註</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {patient.notes || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">建立時間</dt>
              <dd className="mt-1 text-neutral-700">
                {formatDateTimeTW(patient.createdAt)}
                {patient.createdBy?.name && ` · ${patient.createdBy.name}`}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">最近更新</dt>
              <dd className="mt-1 text-neutral-700">
                {formatDateTimeTW(patient.updatedAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>治療紀錄</CardTitle>
              <CardDescription>
                共 {treatments.length} 筆
                {treatments.length > 0 && ` · 累計金額 ${formatTWD(totalRevenue)}`}
              </CardDescription>
            </div>
            {canAddTreatment && (
              <Button asChild size="sm">
                <Link href={`/patients/${patient.id}/treatments/new`}>
                  新增治療紀錄
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TreatmentTable patientId={patient.id} rows={treatments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>回診排程</CardTitle>
          <CardDescription>未來的回診預約</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-neutral-500">
          此功能尚未開放，即將推出。
        </CardContent>
      </Card>
    </div>
  );
}
