import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";
import { createUser } from "@/server/actions/users";
import { requireRole } from "@/server/rbac";

export default async function NewUserPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/admin/users" className="underline-offset-4 hover:underline">
          使用者管理
        </Link>
        <span className="mx-2">/</span>
        <span>新增使用者</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增使用者</CardTitle>
          <CardDescription>
            建立新的系統登入帳號。新帳號建立後即可登入使用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm mode="create" action={createUser} submitLabel="建立使用者" />
        </CardContent>
      </Card>
    </div>
  );
}
