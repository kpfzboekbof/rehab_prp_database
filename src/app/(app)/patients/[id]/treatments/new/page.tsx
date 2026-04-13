import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { createTreatment } from "@/server/actions/treatments";
import { listActiveProducts } from "@/server/queries/treatments";
import { getPatient } from "@/server/queries/patients";
import { requireRole } from "@/server/rbac";

interface NewTreatmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewTreatmentPage({ params }: NewTreatmentPageProps) {
  await requireRole(["DOCTOR", "ADMIN"]);
  const { id: patientId } = await params;

  const [patient, products] = await Promise.all([
    getPatient(patientId),
    listActiveProducts(),
  ]);
  if (!patient) notFound();

  const action = createTreatment.bind(null, patientId);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
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
        <span>新增治療紀錄</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增治療紀錄</CardTitle>
          <CardDescription>
            為「{patient.name}（{patient.chartNumber}）」建立新的 PRP 治療紀錄
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              目前沒有可選的 PRP 品項，請先至「PRP 品項管理」新增。
            </div>
          ) : (
            <TreatmentForm
              action={action}
              products={products}
              submitLabel="建立治療紀錄"
              cancelHref={`/patients/${patient.id}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
