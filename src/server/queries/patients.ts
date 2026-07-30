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
 * need FTS — an ILIKE scan over a few thousand rows is fine.
 *
 * ONE round-trip: `COUNT(*) OVER()` rides along on the page query. Postgres
 * evaluates window functions before LIMIT, so it counts the whole filtered
 * set, not just the 20 rows we keep. This replaces a `findMany` + `count`
 * pair — parallel, but still two Neon round-trips (~100ms each) for what is
 * the most-visited page in the app.
 *
 * Ordering + the `deletedAt IS NULL` filter are served by the
 * `Patient_deletedAt_createdAt_idx` composite added in
 * 20260729141730_perf_composite_indexes.
 */
export async function listPatients({
  q = "",
  page = 1,
  perPage = 20,
}: ListPatientsParams): Promise<ListPatientsResult> {
  const trimmedQ = q.trim();
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.max(1, Math.min(100, Math.floor(perPage)));
  const offset = (safePage - 1) * safePerPage;

  // NOTE: the `%` wrapping is deliberately NOT escaped, because Prisma's
  // `contains` doesn't escape either — it binds a bare `%value%`. So a user
  // typing `%` or `_` gets LIKE-wildcard behaviour. That is pre-existing
  // behaviour and this rewrite preserves it byte-for-byte rather than
  // silently changing what the search box does.
  const like = `%${trimmedQ}%`;
  const searchWhere = trimmedQ
    ? Prisma.sql`
      AND (
           p."name"        ILIKE ${like}
        OR p."chartNumber" ILIKE ${like}
        OR p."phone"       ILIKE ${like}
      )`
    : Prisma.empty;

  type Row = Prisma.PatientGetPayload<object> & {
    total_count: bigint | number;
  };

  const rows = await db.$queryRaw<Row[]>(Prisma.sql`
    SELECT p.*, COUNT(*) OVER()::bigint AS total_count
    FROM "Patient" p
    WHERE p."deletedAt" IS NULL
      ${searchWhere}
    ORDER BY p."createdAt" DESC
    LIMIT ${safePerPage} OFFSET ${offset}
  `);

  // `COUNT(*) OVER()` only comes back attached to a row, so an empty page
  // carries no total. That happens either because nothing matched (total is
  // genuinely 0) or because the caller asked for a page past the end — and in
  // that second case the header still needs the real total. Pay a second
  // round-trip only in that degenerate case; the common path stays at one.
  let total: number;
  if (rows.length > 0) {
    total = Number(rows[0].total_count);
  } else if (offset > 0) {
    total = await db.patient.count({
      where: {
        deletedAt: null,
        ...(trimmedQ
          ? {
              OR: [
                { name: { contains: trimmedQ, mode: "insensitive" } },
                { chartNumber: { contains: trimmedQ, mode: "insensitive" } },
                { phone: { contains: trimmedQ, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
  } else {
    total = 0;
  }

  return {
    // Drop the window-function column so callers get clean `Patient` rows.
    rows: rows.map(({ total_count: _total, ...patient }) => patient),
    total,
    page: safePage,
    perPage: safePerPage,
    totalPages: Math.max(1, Math.ceil(total / safePerPage)),
  };
}

export async function getPatient(id: string) {
  return db.patient.findFirst({
    where: { id, deletedAt: null },
    relationLoadStrategy: "join",
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}
