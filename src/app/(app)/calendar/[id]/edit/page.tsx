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
import { updateAppointment } from "@/server/actions/appointments";
import {
  getAppointment,
  listPatientsForPicker,
} from "@/server/queries/appointments";
import { utcToTaipeiDateTimeInput } from "@/lib/date";
import { requireRole } from "@/server/rbac";

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAppointmentPage({ params }: EditAppointmentPageProps) {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);
  const { id } = await params;

  const [appointment, patients] = await Promise.all([
    getAppointment(id),
    listPatientsForPicker(),
  ]);
  if (!appointment) notFound();

  const action = updateAppointment.bind(null, appointment.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/calendar" className="underline-offset-4 hover:underline">
          回診日曆
        </Link>
        <span className="mx-2">/</span>
        <span>編輯回診排程</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯回診排程</CardTitle>
          <CardDescription>
            修改「{appointment.patient.name}」的回診時間或狀態
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentForm
            action={action}
            patients={patients}
            showStatus={true}
            defaults={{
              patientId: appointment.patientId,
              scheduledAt: utcToTaipeiDateTimeInput(appointment.scheduledAt),
              status: appointment.status,
              reason: appointment.reason ?? "",
              sourceTreatmentId: appointment.sourceTreatmentId ?? "",
            }}
            submitLabel="儲存變更"
            cancelHref="/calendar"
          />
        </CardContent>
      </Card>
    </div>
  );
}
