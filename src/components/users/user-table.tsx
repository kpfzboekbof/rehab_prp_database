import Link from "next/link";
import type { Role } from "@prisma/client";

import { formatDateTimeTW } from "@/lib/date";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { treatments: number; createdPatients: number };
}

const ROLE_BADGES: Record<Role, { label: string; className: string }> = {
  ADMIN: {
    label: "管理者 / 醫師",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  },
  DOCTOR: {
    label: "醫師",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  STAFF: {
    label: "護理師",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
};

interface UserTableProps {
  rows: UserRow[];
  currentUserId: string;
}

export function UserTable({ rows, currentUserId }: UserTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
        尚無使用者
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">姓名</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">角色</th>
            <th className="px-4 py-3 font-medium">狀態</th>
            <th className="px-4 py-3 text-right font-medium">治療 / 病人</th>
            <th className="px-4 py-3 font-medium">建立時間</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((u) => {
            const badge = ROLE_BADGES[u.role];
            const isSelf = u.id === currentUserId;
            return (
              <tr
                key={u.id}
                className={u.active ? "hover:bg-neutral-50" : "bg-neutral-50/50 text-neutral-500"}
              >
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {u.name}
                  {isSelf && (
                    <span className="ml-2 text-xs text-neutral-500">（你）</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-700">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.active ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      啟用中
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-400/30">
                      已停用
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {u._count.treatments} / {u._count.createdPatients}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {formatDateTimeTW(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}/edit`}
                    className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                  >
                    編輯
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
