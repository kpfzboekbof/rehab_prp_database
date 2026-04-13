"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/server/actions/users";

interface PasswordFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}

export function PasswordForm({ action }: PasswordFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const ok = state && state.ok === true;
  const errorMessage = state && state.ok === false ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword">
            新密碼 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="newPassword"
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
          <Label htmlFor="newPasswordConfirm">
            確認新密碼 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="newPasswordConfirm"
            name="passwordConfirm"
            type="password"
            required
            minLength={8}
            maxLength={200}
            autoComplete="new-password"
          />
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}
      {ok && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          密碼已更新
        </div>
      )}

      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "更新中…" : "重設密碼"}
        </Button>
      </div>
    </form>
  );
}
