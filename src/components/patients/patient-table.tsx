import Link from "next/link";
import type { Patient } from "@prisma/client";

import { ageAt, formatDateTW } from "@/lib/date";

const GENDER_LABELS: Record<Patient["gender"], string> = {
  MALE: "男",
  FEMALE: "女",
  OTHER: "其他",
};

interface PatientTableProps {
  rows: Patient[];
}

export function PatientTable({ rows }: PatientTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
        尚無病人資料
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">病歷號</th>
            <th className="px-4 py-3 font-medium">姓名</th>
            <th className="px-4 py-3 font-medium">性別</th>
            <th className="px-4 py-3 font-medium">年齡</th>
            <th className="px-4 py-3 font-medium">電話</th>
            <th className="px-4 py-3 font-medium">建立日期</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3 font-mono text-xs">{p.chartNumber}</td>
              <td className="px-4 py-3 font-medium text-neutral-900">{p.name}</td>
              <td className="px-4 py-3 text-neutral-600">{GENDER_LABELS[p.gender]}</td>
              <td className="px-4 py-3 text-neutral-600">{ageAt(p.birthDate)}</td>
              <td className="px-4 py-3 text-neutral-600">{p.phone || "—"}</td>
              <td className="px-4 py-3 text-neutral-500">{formatDateTW(p.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/patients/${p.id}`}
                  className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                >
                  詳情
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
