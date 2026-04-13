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
import { BODY_PART_LABELS } from "@/lib/body-parts";
import { formatTWD } from "@/lib/currency";
import { formatDateTW, formatDateTimeTW } from "@/lib/date";
import { getTreatment } from "@/server/queries/treatments";
import { requireSession } from "@/server/rbac";

interface TreatmentDetailPageProps {
  params: Promise<{ id: string; treatmentId: string }>;
}

export default async function TreatmentDetailPage({ params }: TreatmentDetailPageProps) {
  const session = await requireSession();
  const { id: patientId, treatmentId } = await params;

  const treatment = await getTreatment(treatmentId);
  if (!treatment || treatment.patientId !== patientId) {
    notFound();
  }

  // Doctors can edit their own; admin can edit anyone's.
  const canEdit =
    session.user.role === "ADMIN" ||
    (session.user.role === "DOCTOR" && treatment.doctorId === session.user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
        <span>治療紀錄</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {formatDateTW(treatment.treatmentDate)} · {BODY_PART_LABELS[treatment.bodyPart]}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {treatment.patient.name}（
            <span className="font-mono">{treatment.patient.chartNumber}</span>）
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/patients/${patientId}`}>← 回到病人總覽</Link>
          </Button>
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/patients/${patientId}/treatments/${treatment.id}/edit`}>
                編輯
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>治療內容</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">治療日期</dt>
              <dd className="mt-1 font-medium">{formatDateTW(treatment.treatmentDate)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">部位</dt>
              <dd className="mt-1 font-medium">
                {BODY_PART_LABELS[treatment.bodyPart]}
                {treatment.bodyPartDetail && ` · ${treatment.bodyPartDetail}`}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">症狀 / 主訴</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">{treatment.symptoms}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">治療前疼痛</dt>
              <dd className="mt-1 font-medium">{treatment.painBefore} / 10</dd>
            </div>
            <div>
              <dt className="text-neutral-500">治療當天治療後疼痛</dt>
              <dd className="mt-1 font-medium">
                {treatment.painImmediateAfter !== null
                  ? `${treatment.painImmediateAfter} / 10`
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">超音波導引註記</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {treatment.ultrasoundNote || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">醫師備註</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {treatment.physicianNote || "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>品項與金額</CardTitle>
          <CardDescription>
            單價與抽成是建立時 snapshot，往後調整品項價格或醫師抽成規則都不會影響這筆紀錄
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">PRP 品項</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                <span>{treatment.product.name}</span>
                {treatment.product.packageSize != null && treatment.quantity > 0 && (
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                    購入套組（{treatment.product.packageSize} 瓶）
                  </span>
                )}
                {treatment.product.packageSize != null && treatment.quantity === 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    使用既有套組
                  </span>
                )}
                {treatment.product.active === false && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    已停用
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">本次注射瓶數</dt>
              <dd className="mt-1 font-mono font-medium">{treatment.vialsUsed} 瓶</dd>
            </div>
            <div>
              <dt className="text-neutral-500">本次計費瓶數</dt>
              <dd className="mt-1 font-mono font-medium">
                {treatment.quantity > 0 ? `${treatment.quantity} 瓶` : "0（已預付）"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">
                {treatment.product.packageSize != null ? "套組總價（snapshot）" : "單價（snapshot）"}
              </dt>
              <dd className="mt-1 font-medium">
                {formatTWD(treatment.unitPriceSnapshot)}
                {treatment.product.packageSize != null && (
                  <span className="ml-1 text-xs text-neutral-500">
                    （平均每瓶{" "}
                    {formatTWD(
                      Math.round(
                        treatment.unitPriceSnapshot / treatment.product.packageSize,
                      ),
                    )}
                    ）
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">本次總金額</dt>
              <dd className="mt-1 text-lg font-semibold">
                {treatment.totalAmount > 0 ? formatTWD(treatment.totalAmount) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">醫師抽成比例（snapshot）</dt>
              <dd className="mt-1 font-medium">
                {(treatment.commissionRateSnapshot * 100).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">醫師抽成金額</dt>
              <dd className="mt-1 font-medium">{formatTWD(treatment.commissionAmount)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>建檔資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">主治醫師</dt>
              <dd className="mt-1 font-medium">
                {treatment.doctor.name}
                <span className="ml-1 text-xs text-neutral-500">
                  · {treatment.doctor.email}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">建立時間</dt>
              <dd className="mt-1 text-neutral-700">
                {formatDateTimeTW(treatment.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">最近更新</dt>
              <dd className="mt-1 text-neutral-700">
                {formatDateTimeTW(treatment.updatedAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-2">
        <Button asChild variant="outline">
          <Link href={`/patients/${patientId}`}>
            ← 回到「{treatment.patient.name}」總覽
          </Link>
        </Button>
      </div>
    </div>
  );
}
