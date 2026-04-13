import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordForm } from "@/components/users/password-form";
import { ToggleActiveUserButton } from "@/components/users/toggle-active-user-button";
import { UserForm } from "@/components/users/user-form";
import { formatDateTimeTW } from "@/lib/date";
import { changeUserPassword, updateUser } from "@/server/actions/users";
import { getUser } from "@/server/queries/users";
import { requireRole } from "@/server/rbac";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const session = await requireRole(["ADMIN"]);
  const { id } = await params;

  const user = await getUser(id);
  if (!user) notFound();

  const isSelf = session.user.id === user.id;

  const updateAction = updateUser.bind(null, user.id);
  const passwordAction = changeUserPassword.bind(null, user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/admin/users" className="underline-offset-4 hover:underline">
          使用者管理
        </Link>
        <span className="mx-2">/</span>
        <span>{user.name}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯使用者</CardTitle>
          <CardDescription>
            修改「{user.name}」的基本資料與角色
            {isSelf && " · 這是你目前登入的帳號"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="edit"
            action={updateAction}
            lockRoleToAdmin={isSelf}
            defaults={{
              name: user.name,
              email: user.email,
              role: user.role,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>重設密碼</CardTitle>
          <CardDescription>
            為「{user.name}」設定新密碼。舊密碼將立即失效。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm action={passwordAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>帳號狀態</CardTitle>
          <CardDescription>
            {user.active
              ? "帳號啟用中，可以登入系統。"
              : "帳號已停用，無法登入系統。既有資料完整保留。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-neutral-600">
              目前狀態：
              {user.active ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  啟用中
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-400/30">
                  已停用
                </span>
              )}
            </div>
            <ToggleActiveUserButton
              userId={user.id}
              active={user.active}
              userName={user.name}
              isSelf={isSelf}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用統計</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">治療紀錄</dt>
              <dd className="mt-1 font-medium">{user._count.treatments} 筆</dd>
            </div>
            <div>
              <dt className="text-neutral-500">建立的病人</dt>
              <dd className="mt-1 font-medium">{user._count.createdPatients} 位</dd>
            </div>
            <div>
              <dt className="text-neutral-500">建立時間</dt>
              <dd className="mt-1 text-neutral-700">{formatDateTimeTW(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">最近更新</dt>
              <dd className="mt-1 text-neutral-700">{formatDateTimeTW(user.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
