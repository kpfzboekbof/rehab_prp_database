-- Add packageSize to PRPProduct (null for regular single-use products;
-- non-null marks a prepaid package containing that many vials).
ALTER TABLE "PRPProduct" ADD COLUMN "packageSize" INTEGER;

-- Add vialsUsed to TreatmentRecord. For regular products this will equal
-- `quantity`; for package products it tracks how many vials were actually
-- injected this visit, separately from the billed `quantity` (which is 0
-- on subsequent use-visits of a pre-purchased package).
ALTER TABLE "TreatmentRecord" ADD COLUMN "vialsUsed" INTEGER NOT NULL DEFAULT 0;

-- Backfill: all existing treatment records are regular products (no
-- packages existed before this migration), so vialsUsed == quantity.
UPDATE "TreatmentRecord" SET "vialsUsed" = "quantity" WHERE "vialsUsed" = 0;
