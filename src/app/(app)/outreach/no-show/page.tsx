import Link from "next/link";

import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import {
  OutreachPatientCard,
  splitByContactState,
} from "@/components/outreach/outreach-patient-card";
import { APPOINTMENT_SESSION_LABELS } from "@/lib/appointment-session";
import { formatDateTW } from "@/lib/date";
import { listNoShowPatients } from "@/server/queries/outreach";
import { requireRole } from "@/server/rbac";

export default async function NoShowOutreachPage() {
  await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const rows = await listNoShowPatients();
  const { open, contacted } = splitByContactState(rows);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href="/analytics" className="underline-offset-4 hover:underline">
          業務分析
        </Link>
        <span className="mx-2">/</span>
        <span>爽約 / 未補約</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">爽約 / 未補約</h1>
        <p className="mt-1 text-sm text-neutral-600">
          上一次預約狀態為「未到」或「已取消」，且目前沒有未來排程的病人。按距今天數排序（越近的越容易撈回來）。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-neutral-900">
          待聯絡
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {open.length > 0 ? `共 ${open.length} 位` : "沒有爽約未補約的病人"}
          </span>
        </h2>
        {open.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">
            目前沒有爽約未補約的病人 ✓
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((r) => (
              <OutreachPatientCard
                key={r.appointmentId}
                patient={r.patient}
                reason="NO_SHOW"
                headline={
                  `${formatDateTW(r.scheduledAt)} ${APPOINTMENT_SESSION_LABELS[r.session]}` +
                  ` · 距今 ${r.daysSince} 天`
                }
                metrics={[
                  {
                    label: "狀態",
                    value: r.status === "NO_SHOW" ? "未到" : "已取消",
                  },
                ]}
                footer={r.reason ?? undefined}
              />
            ))}
          </div>
        )}
      </section>

      {contacted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-neutral-900">
            近期已聯絡
            <span className="ml-2 text-sm font-normal text-neutral-500">
              共 {contacted.length} 位
            </span>
          </h2>
          <div className="space-y-3">
            {contacted.map((r) => (
              <OutreachPatientCard
                key={r.appointmentId}
                patient={r.patient}
                reason="NO_SHOW"
                headline={`${formatDateTW(r.scheduledAt)} · ${r.status === "NO_SHOW" ? "未到" : "已取消"}`}
                metrics={[
                  { label: "距今", value: `${r.daysSince} 天` },
                ]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
