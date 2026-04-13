"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/server/actions/users";

export interface UserFormDefaults {
  name?: string;
  email?: string;
  role?: Role;
}

interface UserFormProps {
  mode: "create" | "edit";
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: UserFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
  /** When editing yourself, the role dropdown is locked on ADMIN to prevent lockout. */
  lockRoleToAdmin?: boolean;
}

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "ADMIN", label: "管理者 / 醫師" },
  { value: "STAFF", label: "護理師" },
];

export function UserForm({
  mode,
  action,
  defaults,
  submitLabel,
  cancelHref = "/admin/users",
  lockRoleToAdmin = false,
}: UserFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const errorMessage = state && state.ok === false ? state.error : null;

  const selectClass =
    "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-50";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            姓名 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={defaults?.name ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">
            Email <span className="text-red-600">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
            defaultValue={defaults?.email ?? ""}
            placeholder="user@clinic.local"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="role">
            角色 <span className="text-red-600">*</span>
          </Label>
          <select
            id="role"
            name="role"
            required
            defaultValue={defaults?.role ?? ""}
            disabled={lockRoleToAdmin}
            className={selectClass}
          >
            <option value="" disabled>
              請選擇
            </option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {lockRoleToAdmin && (
            <p className="text-xs text-neutral-500">
              正在編輯自己的帳號；為避免失去管理權限，角色已鎖定為管理者。
            </p>
          )}
        </div>

        {mode === "create" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">
                密碼 <span className="text-red-600">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={200}
                autoComplete="new-password"
                placeholder="至少 8 個字元"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="passwordConfirm">
                確認密碼 <span className="text-red-600">*</span>
              </Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                maxLength={200}
                autoComplete="new-password"
              />
            </div>
          </>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "儲存中…" : (submitLabel ?? (mode === "create" ? "建立使用者" : "儲存變更"))}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>取消</Link>
        </Button>
      </div>
    </form>
  );
}
