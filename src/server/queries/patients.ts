import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export interface ListPatientsParams {
  q?: string;
  page?: number;
  perPage?: number;
}

export interface ListPatientsResult {
  rows: Awaited<ReturnType<typeof db.patient.findMany>>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Paginated, searchable list of non-deleted patients.
 *
 * Search matches name, chart number, and phone (contains). For a
 * single-clinic workload this is always small enough that we don't
 * need FTS — Prisma `contains` over a few thousand rows is fine.
 */
export async function listPatients({
  q = "",
  page = 1,
  perPage = 20,
}: ListPatientsParams): Promise<ListPatientsResult> {
  const trimmedQ = q.trim();
  const where: Prisma.PatientWhereInput = {
    deletedAt: null,
    ...(trimmedQ
      ? {
          // Postgres `contains` is case-sensitive by default; `mode: insensitive`
          // makes it ILIKE. Safe on Postgres only — if you ever switch providers
          // revisit this file.
          OR: [
            { name: { contains: trimmedQ, mode: "insensitive" } },
            { chartNumber: { contains: trimmedQ, mode: "insensitive" } },
            { phone: { contains: trimmedQ, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.max(1, Math.min(100, Math.floor(perPage)));

  const [rows, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: safePerPage,
      skip: (safePage - 1) * safePerPage,
    }),
    db.patient.count({ where }),
  ]);

  return {
    rows,
    total,
    page: safePage,
    perPage: safePerPage,
    totalPages: Math.max(1, Math.ceil(total / safePerPage)),
  };
}

export async function getPatient(id: string) {
  return db.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}
