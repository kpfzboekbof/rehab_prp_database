import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { createAppointment } from "@/server/actions/appointments";
import { listPatientsForPicker } from "@/server/queries/appointments";
import { getPatient } from "@/server/queries/patients";
import { requireRole } from "@/server/rbac";

interface NewAppointmentPageProps {
  searchParams: Promise<{
    patientId?: string;
    date?: string;
    sourceTreatmentId?: string;
  }>;
}

function defaultScheduledAt(dateParam: string | undefined): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    // Default time 10:00 on the given day.
    return `${dateParam}T10:00`;
  }
  // Otherwise tomorrow 10:00 in Taipei.
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const yyyy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `${yyyy}T10:00`;
}

export default async function NewAppointmentPage({ searchParams }: NewAppointmentPageProps) {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);
  const { patientId, date, sourceTreatmentId } = await searchParams;

  const patients = await listPatientsForPicker();

  // If a patientId was provided, validate it exists (so we don't lock
  // the form to a stale id).
  let lockedPatientId: string | undefined;
  if (patientId) {
    const patient = await getPatient(patientId);
    if (!patient) notFound();
    lockedPatientId = patient.id;
    // Ensure it's in the list (should be already, but keep defensive).
    if (!patients.some((p) => p.id === patient.id)) {
      patients.unshift({
        id: patient.id,
        name: patient.name,
        chartNumber: patient.chartNumber,
      });
    }
  }

  const cancelHref = lockedPatientId ? `/patients/${lockedPatientId}` : "/calendar";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        {lockedPatientId ? (
          <>
            <Link href="/patients" className="underline-offset-4 hover:underline">
              病人管理
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/patients/${lockedPatientId}`}
              className="underline-offset-4 hover:underline"
            >
              {patients.find((p) => p.id === lockedPatientId)?.name ?? "病人"}
            </Link>
            <span className="mx-2">/</span>
            <span>新增回診排程</span>
          </>
        ) : (
          <>
            <Link href="/calendar" className="underline-offset-4 hover:underline">
              回診日曆
            </Link>
            <span className="mx-2">/</span>
            <span>新增回診排程</span>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增回診排程</CardTitle>
          <CardDescription>
            為 PRP 病人預約下次回診時間
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              尚無病人資料，請先建立病人。
            </div>
          ) : (
            <AppointmentForm
              action={createAppointment}
              patients={patients}
              lockedPatientId={lockedPatientId}
              defaults={{
                scheduledAt: defaultScheduledAt(date),
                sourceTreatmentId: sourceTreatmentId ?? "",
              }}
              submitLabel="建立回診"
              cancelHref={cancelHref}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
