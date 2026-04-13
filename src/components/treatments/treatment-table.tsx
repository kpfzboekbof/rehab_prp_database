import Link from "next/link";

import { BODY_PART_LABELS } from "@/lib/body-parts";
import { formatTWD } from "@/lib/currency";
import { formatDateTW } from "@/lib/date";

interface TreatmentRow {
  id: string;
  treatmentDate: Date;
  bodyPart: keyof typeof BODY_PART_LABELS;
  bodyPartDetail: string | null;
  quantity: number;
  vialsUsed: number;
  totalAmount: number;
  painBefore: number;
  painImmediateAfter: number | null;
  product: { name: string; packageSize: number | null };
}

interface TreatmentTableProps {
  patientId: string;
  rows: TreatmentRow[];
}

export function TreatmentTable({ patientId, rows }: TreatmentTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">
        尚無治療紀錄
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">治療日期</th>
            <th className="px-4 py-3 font-medium">部位</th>
            <th className="px-4 py-3 font-medium">品項</th>
            <th className="px-4 py-3 text-right font-medium">本次注射</th>
            <th className="px-4 py-3 text-right font-medium">金額</th>
            <th className="px-4 py-3 font-medium">疼痛（前→後）</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((t) => {
            const isPackage = t.product.packageSize != null;
            const isPackagePurchase = isPackage && t.quantity > 0;
            const isPackageUse = isPackage && t.quantity === 0;
            return (
              <tr key={t.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-700">
                  {formatDateTW(t.treatmentDate)}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {BODY_PART_LABELS[t.bodyPart]}
                  {t.bodyPartDetail && (
                    <span className="ml-1 text-xs text-neutral-500">
                      · {t.bodyPartDetail}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{t.product.name}</span>
                    {isPackagePurchase && (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-1.5 py-0 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                        購入套組
                      </span>
                    )}
                    {isPackageUse && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        套組使用
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-neutral-700">
                  {t.vialsUsed} 瓶
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-900">
                  {t.totalAmount > 0 ? formatTWD(t.totalAmount) : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {t.painBefore}
                  {t.painImmediateAfter !== null && ` → ${t.painImmediateAfter}`}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/patients/${patientId}/treatments/${t.id}`}
                    className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                  >
                    詳情
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
