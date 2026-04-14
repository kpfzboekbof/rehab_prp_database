import { NextResponse } from "next/server";
import { BodyPart, Gender } from "@prisma/client";

import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { BODY_PART_LABELS } from "@/lib/body-parts";
import { ageAt, formatDateTW } from "@/lib/date";
import { searchResearch } from "@/server/queries/research";
import { requireRole } from "@/server/rbac";

/**
 * De-identified CSV export of research / QI filter results.
 *
 * Per AGENTS.md: CSV exports are de-identified by default. This route
 * emits `age` (computed today from birthDate) instead of a birth date,
 * and does NOT include `name` or `chartNumber`. Only internal clinical
 * fields (treatment date, body part, product, quantities, totals) are
 * exported.
 *
 * Query params mirror the /research page's filter form.
 */
export async function GET(request: Request) {
  await requireRole(["DOCTOR", "ADMIN"]);

  const url = new URL(request.url);
  const get = (key: string) => {
    const v = url.searchParams.get(key);
    return v && v.trim() !== "" ? v.trim() : undefined;
  };

  const bodyPart = get("bodyPart") as BodyPart | undefined;
  const gender = get("gender") as Gender | undefined;
  const productId = get("productId");
  const dateFrom = get("dateFrom");
  const dateTo = get("dateTo");
  const ageMinRaw = get("ageMin");
  const ageMaxRaw = get("ageMax");
  const ageMin =
    ageMinRaw !== undefined ? Number.parseInt(ageMinRaw, 10) : undefined;
  const ageMax =
    ageMaxRaw !== undefined ? Number.parseInt(ageMaxRaw, 10) : undefined;

  const { rows, truncated, total } = await searchResearch({
    bodyPart,
    gender,
    productId,
    dateFrom,
    dateTo,
    ageMin: Number.isFinite(ageMin) ? ageMin : undefined,
    ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
  });

  const genderLabel: Record<Gender, string> = {
    MALE: "男",
    FEMALE: "女",
    OTHER: "其他",
  };

  // Stack meta + headers + data rows into a single toCsv() call so we
  // only emit one UTF-8 BOM.
  const allRows: Array<Array<unknown>> = [
    ["研究資料庫匯出（去識別化）"],
    [
      `共 ${total} 筆`,
      truncated ? `（超過上限，僅匯出前 ${rows.length} 筆）` : "",
    ],
    ["匯出時間", formatDateTW(new Date())],
    [],
    [
      "治療日期",
      "年齡",
      "性別",
      "部位",
      "部位詳情",
      "PRP 品項",
      "購入瓶數",
      "本次注射",
      "總金額",
    ],
    ...rows.map((r) => [
      formatDateTW(r.treatmentDate),
      ageAt(r.patient.birthDate),
      genderLabel[r.patient.gender],
      BODY_PART_LABELS[r.bodyPart],
      r.bodyPartDetail ?? "",
      r.product.name,
      r.quantity,
      r.vialsUsed,
      r.totalAmount,
    ]),
  ];

  const csv = toCsv(null, allRows);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new NextResponse(csv, {
    headers: csvResponseHeaders(`research-export-${today}.csv`),
  });
}
