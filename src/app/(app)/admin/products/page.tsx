import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/products/product-table";
import { listProducts } from "@/server/queries/products";
import { requireRole } from "@/server/rbac";

export default async function AdminProductsPage() {
  // Also marks this page as dynamic (it reads cookies via auth()) so Next.js
  // does not attempt to prerender it at build time.
  await requireRole(["ADMIN"]);

  const rows = await listProducts();
  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">PRP 品項管理</h1>
          <p className="mt-1 text-sm text-neutral-600">
            共 {rows.length} 項（啟用中 {activeCount} 項）· 維護品項名稱、單價與備註
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">新增品項</Link>
        </Button>
      </div>

      <ProductTable rows={rows} />

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>關於調價：</strong>
        調整既有品項的單價 <em>不會</em> 影響既有的治療紀錄金額，因為每筆紀錄在建立時已經 snapshot 當時的單價。若需要重新計算過去紀錄，請直接編輯該筆治療紀錄。
      </div>
    </div>
  );
}
