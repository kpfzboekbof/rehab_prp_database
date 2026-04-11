import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientTable } from "@/components/patients/patient-table";
import { listPatients } from "@/server/queries/patients";

interface PatientsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const { q = "", page: pageParam = "1" } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);

  const { rows, total, totalPages, perPage } = await listPatients({ q, page });

  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(total, page * perPage);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">病人管理</h1>
          <p className="mt-1 text-sm text-neutral-600">
            目前共 {total} 位病人
            {total > 0 && ` · 顯示 ${rangeStart}–${rangeEnd}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/patients/new">新增病人</Link>
        </Button>
      </div>

      <form action="/patients" method="get" className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋姓名、病歷號或電話"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          搜尋
        </Button>
        {q && (
          <Button asChild type="button" variant="ghost">
            <Link href="/patients">清除</Link>
          </Button>
        )}
      </form>

      <PatientTable rows={rows} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>
            第 {page} / {totalPages} 頁
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link
                href={{
                  pathname: "/patients",
                  query: { ...(q ? { q } : {}), page: Math.max(1, page - 1) },
                }}
              >
                上一頁
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link
                href={{
                  pathname: "/patients",
                  query: { ...(q ? { q } : {}), page: Math.min(totalPages, page + 1) },
                }}
              >
                下一頁
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
