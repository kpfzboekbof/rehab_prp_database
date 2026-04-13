import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UserTable } from "@/components/users/user-table";
import { listUsers } from "@/server/queries/users";
import { requireRole } from "@/server/rbac";

export default async function AdminUsersPage() {
  const session = await requireRole(["ADMIN"]);
  const rows = await listUsers();

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">使用者管理</h1>
          <p className="mt-1 text-sm text-neutral-600">
            共 {rows.length} 位（啟用中 {activeCount} 位）· 管理系統登入帳號與角色
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">新增使用者</Link>
        </Button>
      </div>

      <UserTable rows={rows} currentUserId={session.user.id} />

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>角色說明：</strong>
        <br />
        <strong>管理者 / 醫師</strong>：院長本人，擁有所有功能權限，可建立病人、治療紀錄、管理系統設定。
        <br />
        <strong>護理師</strong>：只能檢視病人與回診相關功能，不能修改治療紀錄或管理系統。
        <br />
        <br />
        使用者帳號不允許刪除（治療紀錄等有外鍵關聯），僅能停用。停用後帳號無法登入，但所有歷史資料完整保留。
      </div>
    </div>
  );
}
