/**
 * One-off data correction: 35% commission rate → 30%
 *
 * Background: at some point a 35% commission rate row was created in
 * DoctorCommissionRate (probably during early setup / testing), and a
 * number of TreatmentRecord rows got their `commissionRateSnapshot`
 * frozen at 0.35. The clinic owner has confirmed the actual commission
 * has always been 30% and the 35% rows are wrong data — not a real
 * historical rate change.
 *
 * AGENTS.md normally forbids touching snapshot fields on
 * TreatmentRecord. This script is an EXPLICIT one-time exception
 * because the data is incorrect, not just historical. After this
 * runs, the snapshot rule applies again as normal.
 *
 * What this script does (in a single transaction):
 *   1. Find every TreatmentRecord with commissionRateSnapshot ≈ 0.35
 *   2. For each row, recompute:
 *        commissionRateSnapshot = 0.30
 *        commissionAmount       = round(totalAmount * 0.30)
 *   3. Find every DoctorCommissionRate with rate ≈ 0.35
 *   4. For each such rate row, if it has a successor (the rate that
 *      closed it), update the successor's effectiveFrom to point at
 *      the deleted row's effectiveFrom (so the history reads "30% from
 *      day one" instead of "30% since the day we replaced 35%").
 *   5. Delete the 35% rate row(s).
 *
 * Usage:
 *   # Dry-run (default) — prints what WOULD change, no writes:
 *   npx tsx --env-file-if-exists=.env prisma/scripts/fix-commission-35-to-30.ts
 *
 *   # Actually apply the change:
 *   npx tsx --env-file-if-exists=.env prisma/scripts/fix-commission-35-to-30.ts --execute
 *
 * Both phases connect to whatever DATABASE_URL points at, so make sure
 * your `.env` is pointing at the right database before running with
 * --execute. Run dry-run twice if you're nervous — it's read-only.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Float comparison tolerance — 0.35 is not exactly representable in
// IEEE 754 binary, so use a tight range instead of `equals: 0.35`.
const OLD_RATE_MIN = 0.349;
const OLD_RATE_MAX = 0.351;
const NEW_RATE = 0.3;

const isExecute = process.argv.includes("--execute");

function fmtTwd(n: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("");
  console.log("================================================================");
  console.log("  Commission snapshot fix-up: 35% → 30%");
  console.log("================================================================");
  console.log(`Mode: ${isExecute ? "EXECUTE (writes will happen)" : "DRY RUN (read-only)"}`);
  console.log("");

  // --- Step 1: find affected treatment records ---
  const affected = await prisma.treatmentRecord.findMany({
    where: {
      commissionRateSnapshot: { gte: OLD_RATE_MIN, lte: OLD_RATE_MAX },
    },
    select: {
      id: true,
      treatmentDate: true,
      totalAmount: true,
      commissionRateSnapshot: true,
      commissionAmount: true,
      doctor: { select: { name: true } },
      patient: { select: { chartNumber: true, name: true } },
    },
    orderBy: { treatmentDate: "asc" },
  });

  console.log(`[1] TreatmentRecord rows with 35%-ish snapshot: ${affected.length}`);
  console.log("");

  if (affected.length > 0) {
    let totalOldCommission = 0;
    let totalNewCommission = 0;
    let totalRevenue = 0;
    for (const t of affected) {
      totalOldCommission += t.commissionAmount;
      totalNewCommission += Math.round(t.totalAmount * NEW_RATE);
      totalRevenue += t.totalAmount;
    }

    const sample = affected.slice(0, 15);
    console.log("    First 15 affected records:");
    console.log("    " + "─".repeat(82));
    for (const t of sample) {
      const newAmt = Math.round(t.totalAmount * NEW_RATE);
      const oldRate = (t.commissionRateSnapshot * 100).toFixed(2);
      console.log(
        `    ${fmtDate(t.treatmentDate)} | ${t.doctor.name.padEnd(6)} | ` +
          `${t.patient.chartNumber.padEnd(8)} | ` +
          `revenue ${String(t.totalAmount).padStart(7)} | ` +
          `${oldRate}% (${String(t.commissionAmount).padStart(6)}) → ` +
          `30.00% (${String(newAmt).padStart(6)})`,
      );
    }
    if (affected.length > sample.length) {
      console.log(`    ... and ${affected.length - sample.length} more`);
    }
    console.log("    " + "─".repeat(82));
    console.log("");
    console.log(`    Total revenue across affected rows: ${fmtTwd(totalRevenue)}`);
    console.log(`    Old commission sum (35%):           ${fmtTwd(totalOldCommission)}`);
    console.log(`    New commission sum (30%):           ${fmtTwd(totalNewCommission)}`);
    console.log(
      `    Difference removed from reports:    ${fmtTwd(totalOldCommission - totalNewCommission)}`,
    );
    console.log("");
  }

  // --- Step 2: find 35% commission rate rows ---
  const oldRateRows = await prisma.doctorCommissionRate.findMany({
    where: { rate: { gte: OLD_RATE_MIN, lte: OLD_RATE_MAX } },
    include: { doctor: { select: { name: true } } },
    orderBy: { effectiveFrom: "asc" },
  });

  console.log(`[2] DoctorCommissionRate rows with 35%-ish rate: ${oldRateRows.length}`);
  if (oldRateRows.length > 0) {
    console.log("    " + "─".repeat(82));
    for (const r of oldRateRows) {
      const ratePct = (r.rate * 100).toFixed(2);
      const range = `${fmtDate(r.effectiveFrom)} → ${r.effectiveTo ? fmtDate(r.effectiveTo) : "目前"}`;
      console.log(
        `    ${r.doctor.name.padEnd(6)} | ${ratePct}% | ${range} | note: ${r.note ?? "—"}`,
      );
    }
    console.log("    " + "─".repeat(82));
    console.log("");
  }

  if (affected.length === 0 && oldRateRows.length === 0) {
    console.log("Nothing to fix. Database is already clean.");
    return;
  }

  if (!isExecute) {
    console.log("");
    console.log("================================================================");
    console.log("  Dry run complete. Re-run with --execute to APPLY the change.");
    console.log("================================================================");
    return;
  }

  // --- Step 3: execute the fix in a single transaction ---
  console.log("Applying changes in a transaction...");
  console.log("");

  await prisma.$transaction(async (tx) => {
    // 3a. Update treatment record snapshots.
    for (const t of affected) {
      const newAmount = Math.round(t.totalAmount * NEW_RATE);
      await tx.treatmentRecord.update({
        where: { id: t.id },
        data: {
          commissionRateSnapshot: NEW_RATE,
          commissionAmount: newAmount,
        },
      });
    }
    console.log(`    ✓ Updated ${affected.length} TreatmentRecord rows`);

    // 3b. For each 35% rate row, re-stitch history then delete.
    let stitched = 0;
    let deleted = 0;
    for (const oldRate of oldRateRows) {
      if (oldRate.effectiveTo) {
        // Has a successor — find it and back-date its effectiveFrom
        // to absorb the deleted row's interval.
        const successor = await tx.doctorCommissionRate.findFirst({
          where: {
            doctorId: oldRate.doctorId,
            effectiveFrom: oldRate.effectiveTo,
          },
        });
        if (successor) {
          await tx.doctorCommissionRate.update({
            where: { id: successor.id },
            data: { effectiveFrom: oldRate.effectiveFrom },
          });
          stitched += 1;
        }
      }
      await tx.doctorCommissionRate.delete({ where: { id: oldRate.id } });
      deleted += 1;
    }
    console.log(`    ✓ Re-stitched ${stitched} successor rate rows`);
    console.log(`    ✓ Deleted ${deleted} obsolete 35% rate rows`);
  });

  console.log("");
  console.log("================================================================");
  console.log("  Done. Open /admin/commission and /reports/monthly to verify.");
  console.log("================================================================");
}

main()
  .catch((err) => {
    console.error("");
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
