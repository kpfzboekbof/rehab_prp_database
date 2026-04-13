import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommissionForm } from "@/components/commission/commission-form";
import { createCommissionRate } from "@/server/actions/commission";
import { listDoctorsWithRates } from "@/server/queries/commission";
import { requireRole } from "@/server/rbac";

interface NewCommissionPageProps {
  searchParams: Promise<{ doctorId?: string }>;
}

export default async function NewCommissionPage({ searchParams }: NewCommissionPageProps) {
  await requireRole(["ADMIN"]);
  const { doctorId } = await searchParams;

  const doctors = await listDoctorsWithRates();
  const preselected = doctorId && doctors.some((d) => d.id === doctorId) ? doctorId : "";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/admin/commission" className="underline-offset-4 hover:underline">
          醫師抽成設定
        </Link>
        <span className="mx-2">/</span>
        <span>新增抽成規則</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增抽成規則</CardTitle>
          <CardDescription>
            新規則會自動關閉該醫師目前有效的規則（effectiveTo 設為本次生效日）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              尚無 DOCTOR 或 ADMIN 使用者。請先至「使用者管理」建立帳號。
            </div>
          ) : (
            <CommissionForm
              action={createCommissionRate}
              doctors={doctors.map((d) => ({
                id: d.id,
                name: d.name,
                email: d.email,
                role: d.role === "DOCTOR" ? "DOCTOR" : "ADMIN",
              }))}
              defaults={{ doctorId: preselected }}
              submitLabel="建立規則"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
