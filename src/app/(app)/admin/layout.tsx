import { requireRole } from "@/server/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  return <>{children}</>;
}
