import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/rbac";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return (
    <AppShell userName={session.user.name || session.user.email || ""} role={session.user.role}>
      {children}
    </AppShell>
  );
}
