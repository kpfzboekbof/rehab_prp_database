import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientForm } from "@/components/patients/patient-form";
import { ageAt } from "@/lib/date";
import { updatePatient } from "@/server/actions/patients";
import { getPatient } from "@/server/queries/patients";

interface EditPatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) {
    notFound();
  }

  // Bind the patient id to the update action so the form gets a
  // `(state, formData) => Promise<ActionState>` signature.
  const action = updatePatient.bind(null, patient.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/patients" className="underline-offset-4 hover:underline">
          病人管理
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/patients/${patient.id}`}
          className="underline-offset-4 hover:underline"
        >
          {patient.name}
        </Link>
        <span className="mx-2">/</span>
        <span>編輯</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯病人資料</CardTitle>
          <CardDescription>修改「{patient.name}」的基本資料</CardDescription>
        </CardHeader>
        <CardContent>
          <PatientForm
            action={action}
            submitLabel="儲存變更"
            cancelHref={`/patients/${patient.id}`}
            defaults={{
              chartNumber: patient.chartNumber,
              name: patient.name,
              gender: patient.gender,
              age: ageAt(patient.birthDate),
              phone: patient.phone ?? "",
              address: patient.address ?? "",
              notes: patient.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
