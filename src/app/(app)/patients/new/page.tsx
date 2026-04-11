import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientForm } from "@/components/patients/patient-form";
import { createPatient } from "@/server/actions/patients";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/patients" className="underline-offset-4 hover:underline">
          病人管理
        </Link>
        <span className="mx-2">/</span>
        <span>新增病人</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增病人</CardTitle>
          <CardDescription>建立新的病人基本資料</CardDescription>
        </CardHeader>
        <CardContent>
          <PatientForm action={createPatient} submitLabel="建立病人" />
        </CardContent>
      </Card>
    </div>
  );
}
