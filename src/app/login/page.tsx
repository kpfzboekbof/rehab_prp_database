import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginPageProps {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from, error } = await searchParams;

  // If the user is already authenticated, skip the form.
  const session = await auth();
  if (session?.user) {
    redirect(from && from.startsWith("/") ? from : "/dashboard");
  }

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const rawTarget = String(formData.get("from") || "/dashboard");
    const target = rawTarget.startsWith("/") ? rawTarget : "/dashboard";

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: target,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=credentials&from=${encodeURIComponent(target)}`);
      }
      // Re-throw redirects and other non-auth errors so Next.js handles them.
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>龜山康澤PRP管理系統</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <input type="hidden" name="from" value={from || "/dashboard"} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
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
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                登入失敗，請確認帳號密碼。
              </p>
            )}
            <Button type="submit" className="w-full">
              登入
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-neutral-500">
            忘記密碼？請聯絡系統管理員。
            <br />
            <Link href="/" className="underline">
              回首頁
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
