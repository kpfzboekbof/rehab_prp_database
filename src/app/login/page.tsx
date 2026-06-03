import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CLINIC_NAME } from "@/lib/clinic";
import { LoginForm } from "./login-form";

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
          <CardDescription>{CLINIC_NAME}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm action={login} from={from || "/dashboard"} error={error} />
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
