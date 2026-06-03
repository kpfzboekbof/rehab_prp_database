"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  action: (formData: FormData) => void | Promise<void>;
  from: string;
  error?: string;
}

/**
 * Client wrapper around the login form so the submit button can show a
 * pending state. Without it the form gives no feedback while the server
 * action runs — on a cold Neon connection that can take a couple of
 * seconds and the page looks frozen ("卡住"), tempting double-submits.
 * `useFormStatus` disables the controls and flips the label while the
 * action is in flight.
 */
export function LoginForm({ action, from, error }: LoginFormProps) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      <Fields error={error} />
    </form>
  );
}

function Fields({ error }: { error?: string }) {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">電子郵件</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          disabled={pending}
          autoComplete="username"
          placeholder="admin@clinic.local"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">密碼</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          disabled={pending}
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          登入失敗，請確認帳號密碼。
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "登入中…" : "登入"}
      </Button>
    </>
  );
}
