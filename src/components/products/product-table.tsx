import Link from "next/link";

import { formatTWD } from "@/lib/currency";
import { formatDateTimeTW } from "@/lib/date";

interface ProductRow {
  id: string;
  name: string;
  unitPrice: number;
  packageSize: number | null;
  active: boolean;
  notes: string | null;
  updatedAt: Date;
  _count: { treatments: number };
}

interface ProductTableProps {
  rows: ProductRow[];
}

export function ProductTable({ rows }: ProductTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
        尚無 PRP 品項
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">名稱</th>
            <th className="px-4 py-3 text-right font-medium">單價</th>
            <th className="px-4 py-3 font-medium">狀態</th>
            <th className="px-4 py-3 text-right font-medium">治療使用數</th>
            <th className="px-4 py-3 font-medium">最近更新</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((p) => (
            <tr key={p.id} className={p.active ? "hover:bg-neutral-50" : "bg-neutral-50/50 text-neutral-500"}>
              <td className="px-4 py-3 font-medium text-neutral-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{p.name}</span>
                  {p.packageSize != null && (
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                      預付套組 · {p.packageSize} 瓶
                    </span>
                  )}
                </div>
                {p.notes && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                    {p.notes}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatTWD(p.unitPrice)}
                {p.packageSize != null && (
                  <div className="text-[10px] text-neutral-500">
                    平均每瓶 {formatTWD(Math.round(p.unitPrice / p.packageSize))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {p.active ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    啟用中
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-400/30">
                    已停用
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-neutral-700">
                {p._count.treatments}
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {formatDateTimeTW(p.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                >
                  編輯
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
