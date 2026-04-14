import { BodyPart, Gender, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { taipeiDayEnd, taipeiDayStart } from "@/lib/date";

/**
 * Research / QI filtering — returns a flat list of treatment records
 * that match the given filter criteria. Used by both the on-screen
 * table and the CSV export (which further de-identifies).
 */

export interface ResearchFilters {
  bodyPart?: BodyPart;
  gender?: Gender;
  productId?: string;
  ageMin?: number;
  ageMax?: number;
  /** YYYY-MM-DD */
  dateFrom?: string;
  /** YYYY-MM-DD */
  dateTo?: string;
}

export const RESEARCH_ROW_CAP = 500;

/**
 * Compute the `birthDate` range corresponding to an [ageMin, ageMax]
 * range. Age is derived from birthDate via `ageAt()` — we invert that
 * to a birth-date window.
 *
 * Someone is "age N" today if their birthDate is in
 *    (today − (N+1) years, today − N years]
 * so we combine bounds for the min / max ages like this:
 *   - ageMin set  → birthDate <= today − ageMin years (i.e. birthDate ≤ older-end)
 *   - ageMax set  → birthDate >  today − (ageMax+1) years
 */
function ageRangeToBirthRange(
  ageMin: number | undefined,
  ageMax: number | undefined,
): { gte?: Date; lte?: Date } {
  const out: { gte?: Date; lte?: Date } = {};
  const now = new Date();
  if (typeof ageMin === "number") {
    // birthDate must be ≤ today − ageMin years
    out.lte = new Date(
      Date.UTC(
        now.getUTCFullYear() - ageMin,
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
      ),
    );
  }
  if (typeof ageMax === "number") {
    // birthDate must be > today − (ageMax+1) years
    out.gte = new Date(
      Date.UTC(
        now.getUTCFullYear() - ageMax - 1,
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        now.getUTCHours(),
        now.getUTCMinutes(),
      ),
    );
  }
  return out;
}

export interface ResearchRow {
  id: string;
  treatmentDate: Date;
  bodyPart: BodyPart;
  bodyPartDetail: string | null;
  quantity: number;
  vialsUsed: number;
  totalAmount: number;
  product: { id: string; name: string; packageSize: number | null };
  patient: {
    id: string;
    name: string;
    chartNumber: string;
    gender: Gender;
    birthDate: Date;
  };
  doctor: { id: string; name: string };
}

export async function searchResearch(
  filters: ResearchFilters,
): Promise<{ rows: ResearchRow[]; truncated: boolean; total: number }> {
  const where: Prisma.TreatmentRecordWhereInput = {};

  if (filters.bodyPart) {
    where.bodyPart = filters.bodyPart;
  }
  if (filters.productId) {
    where.productId = filters.productId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.treatmentDate = {};
    if (filters.dateFrom) {
      where.treatmentDate = {
        ...(where.treatmentDate as object),
        gte: taipeiDayStart(filters.dateFrom),
      };
    }
    if (filters.dateTo) {
      where.treatmentDate = {
        ...(where.treatmentDate as object),
        lt: taipeiDayEnd(filters.dateTo),
      };
    }
  }

  const birthRange = ageRangeToBirthRange(filters.ageMin, filters.ageMax);
  const patientFilter: Prisma.PatientWhereInput = { deletedAt: null };
  if (filters.gender) patientFilter.gender = filters.gender;
  if (birthRange.gte || birthRange.lte) {
    patientFilter.birthDate = {
      ...(birthRange.gte ? { gte: birthRange.gte } : {}),
      ...(birthRange.lte ? { lte: birthRange.lte } : {}),
    };
  }
  where.patient = patientFilter;

  const [rows, total] = await Promise.all([
    db.treatmentRecord.findMany({
      where,
      orderBy: { treatmentDate: "desc" },
      take: RESEARCH_ROW_CAP + 1, // +1 so we can detect truncation
      include: {
        product: { select: { id: true, name: true, packageSize: true } },
        patient: {
          select: {
            id: true,
            name: true,
            chartNumber: true,
            gender: true,
            birthDate: true,
          },
        },
        doctor: { select: { id: true, name: true } },
      },
    }),
    db.treatmentRecord.count({ where }),
  ]);

  const truncated = rows.length > RESEARCH_ROW_CAP;
  const clipped = truncated ? rows.slice(0, RESEARCH_ROW_CAP) : rows;

  return { rows: clipped, truncated, total };
}
