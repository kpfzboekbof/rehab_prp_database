import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  OutreachPatientCard,
  splitByContactState,
} from "@/components/outreach/outreach-patient-card";
import { formatTWD } from "@/lib/currency";
import { formatDateTW } from "@/lib/date";
import { listPackageFinishedPatients } from "@/server/queries/outreach";
import { requireRole } from "@/server/rbac";

interface PackageFinishedPageProps {
  searchParams: Promise<{ days?: string }>;
}

const AVAILABLE_THRESHOLDS = [14, 30, 60, 90] as const;

export default async function PackageFinishedOutreachPage({
  searchParams,
}: PackageFinishedPageProps) {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const params = await searchParams;
  const rawDays = Number.parseInt(params.days ?? "", 10);
  const days = rawDays > 0 && rawDays <= 365 ? rawDays : 30;

  const rows = await listPackageFinishedPatients(days);
  const { open, contacted } = splitByContactState(rows);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/analytics" className="underline-offset-4 hover:underline">
          業務分析
        </Link>
        <span className="mx-2">/</span>
        <span>套組用完</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">套組用完未續購</h1>
        <p className="mt-1 text-sm text-neutral-600">
          買過預付套組且剩餘 <strong>0 瓶</strong>、最後一次使用已超過 <strong>{days}</strong> 天的病人。按距今天數排序（距今最短的先打，最容易喚回記憶）。
        </p>
      </div>

      {/* Threshold selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-3">
        <span className="text-sm text-neutral-600">用完距今門檻：</span>
        {AVAILABLE_THRESHOLDS.map((d) => (
          <Button
            key={d}
            asChild
            size="sm"
            variant={d === days ? "default" : "outline"}
          >
            <Link
              href={{ pathname: "/outreach/package-finished", query: { days: d } }}
            >
              {d} 天
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
              : "沒有符合條件的病人"}
          </span>
        </h2>
        {open.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">
            這個門檻下沒有套組用完的病人 ✓
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((r) => (
              <OutreachPatientCard
                key={`${r.patient.id}-${r.productId}`}
                patient={r.patient}
                reason="PACKAGE_FINISHED"
                headline={`${r.productName}（${r.packageSize} 瓶）已用完 · 距今 ${r.daysSince} 天`}
                metrics={[
                  {
                    label: "套組單價",
                    value: formatTWD(r.unitPriceSnapshotLatest),
                  },
                  {
                    label: "平均/瓶",
                    value: formatTWD(
                      Math.round(r.unitPriceSnapshotLatest / r.packageSize),
                    ),
                  },
                ]}
                footer={`累計購入 ${r.purchasedTotal} 瓶、已使用 ${r.usedTotal} 瓶 · 最後使用 ${formatDateTW(r.lastUsedAt)}`}
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
                key={`${r.patient.id}-${r.productId}`}
                patient={r.patient}
                reason="PACKAGE_FINISHED"
                headline={`${r.productName} 套組已用完`}
                metrics={[
                  {
                    label: "距今",
                    value: `${r.daysSince} 天`,
                  },
                ]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
