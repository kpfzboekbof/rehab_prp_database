import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  OutreachPatientCard,
  splitByContactState,
} from "@/components/outreach/outreach-patient-card";
import { BODY_PART_LABELS } from "@/lib/body-parts";
import { formatTWD } from "@/lib/currency";
import { formatDateTW } from "@/lib/date";
import { listDormantPatients } from "@/server/queries/outreach";
import { requireRole } from "@/server/rbac";

interface DormantPageProps {
  searchParams: Promise<{ months?: string }>;
}

const AVAILABLE_THRESHOLDS = [1, 3, 6, 12] as const;

export default async function DormantOutreachPage({
  searchParams,
}: DormantPageProps) {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const params = await searchParams;
  const rawMonths = Number.parseInt(params.months ?? "", 10);
  const months =
    rawMonths > 0 && rawMonths <= 36 ? rawMonths : 3;

  const rows = await listDormantPatients(months);
  const { open, contacted } = splitByContactState(rows);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/analytics" className="underline-offset-4 hover:underline">
          業務分析
        </Link>
        <span className="mx-2">/</span>
        <span>沉睡病人</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">沉睡病人</h1>
        <p className="mt-1 text-sm text-neutral-600">
          最後一次治療超過 <strong>{months}</strong> 個月、且沒有未來回診排程的病人。按累計消費倒序排列（消費金額高的先打）。
        </p>
      </div>

      {/* Threshold selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-3">
        <span className="text-sm text-neutral-600">沉睡門檻：</span>
        {AVAILABLE_THRESHOLDS.map((m) => (
          <Button
            key={m}
            asChild
            size="sm"
            variant={m === months ? "default" : "outline"}
          >
            <Link
              href={{ pathname: "/outreach/dormant", query: { months: m } }}
            >
              {m} 個月
            </Link>
          </Button>
        ))}
      </div>

      {/* Main list */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-neutral-900">
          待聯絡
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {open.length > 0
              ? `共 ${open.length} 位`
              : "沒有待聯絡的病人"}
          </span>
        </h2>
        {open.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">
            這個門檻下沒有沉睡病人 ✓
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((r) => (
              <OutreachPatientCard
                key={r.patient.id}
                patient={r.patient}
                reason="DORMANT"
                headline={`已沉睡 ${r.daysSince} 天 · 最後一次 ${formatDateTW(r.lastTreatmentDate)}`}
                metrics={[
                  { label: "累計消費", value: formatTWD(r.lifetimeRevenue) },
                  { label: "治療次數", value: `${r.treatmentCount} 次` },
                ]}
                footer={`最後部位：${BODY_PART_LABELS[r.lastBodyPart]} · 品項：${r.lastProductName} · 金額 ${formatTWD(r.lastAmount)}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Contacted list */}
      {contacted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-neutral-900">
            近期已聯絡
            <span className="ml-2 text-sm font-normal text-neutral-500">
              共 {contacted.length} 位 · 60 天內聯絡過
            </span>
          </h2>
          <div className="space-y-3">
            {contacted.map((r) => (
              <OutreachPatientCard
                key={r.patient.id}
                patient={r.patient}
                reason="DORMANT"
                headline={`已沉睡 ${r.daysSince} 天`}
                metrics={[
                  { label: "累計消費", value: formatTWD(r.lifetimeRevenue) },
                ]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
