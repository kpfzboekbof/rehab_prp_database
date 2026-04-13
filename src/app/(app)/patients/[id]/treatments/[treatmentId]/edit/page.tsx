import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { updateTreatment } from "@/server/actions/treatments";
import {
  getTreatment,
  listActiveProducts,
} from "@/server/queries/treatments";
import { requireRole } from "@/server/rbac";

interface EditTreatmentPageProps {
  params: Promise<{ id: string; treatmentId: string }>;
}

function toDateInput(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default async function EditTreatmentPage({ params }: EditTreatmentPageProps) {
  const session = await requireRole(["DOCTOR", "ADMIN"]);
  const { id: patientId, treatmentId } = await params;

  const [treatment, products] = await Promise.all([
    getTreatment(treatmentId),
    listActiveProducts(),
  ]);

  if (!treatment || treatment.patientId !== patientId) {
    notFound();
  }

  // DOCTOR can only edit own treatments.
  if (session.user.role === "DOCTOR" && treatment.doctorId !== session.user.id) {
    redirect(`/patients/${patientId}/treatments/${treatmentId}?error=forbidden`);
  }

  // If the original product is inactive and not in the active list, include it
  // so the select still shows the current selection and doesn't silently drop it.
  const productsForForm = products.some((p) => p.id === treatment.product.id)
    ? products
    : [
        {
          id: treatment.product.id,
          name: `${treatment.product.name}（已停用）`,
          unitPrice: treatment.product.unitPrice,
        },
        ...products,
      ];

  const action = updateTreatment.bind(null, patientId, treatmentId);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/patients" className="underline-offset-4 hover:underline">
          病人管理
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/patients/${patientId}`}
          className="underline-offset-4 hover:underline"
        >
          {treatment.patient.name}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/patients/${patientId}/treatments/${treatmentId}`}
          className="underline-offset-4 hover:underline"
        >
          治療紀錄
        </Link>
        <span className="mx-2">/</span>
        <span>編輯</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯治療紀錄</CardTitle>
          <CardDescription>
            編輯會重新 snapshot 單價與醫師抽成，修正後的總額以當下品項與抽成為準
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TreatmentForm
            action={action}
            products={productsForForm}
            submitLabel="儲存變更"
            cancelHref={`/patients/${patientId}/treatments/${treatmentId}`}
            defaults={{
              treatmentDate: toDateInput(treatment.treatmentDate),
              bodyPart: treatment.bodyPart,
              bodyPartDetail: treatment.bodyPartDetail ?? "",
              symptoms: treatment.symptoms,
              painBefore: treatment.painBefore,
              painImmediateAfter: treatment.painImmediateAfter,
              productId: treatment.product.id,
              quantity: treatment.quantity,
              ultrasoundNote: treatment.ultrasoundNote ?? "",
              physicianNote: treatment.physicianNote ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
