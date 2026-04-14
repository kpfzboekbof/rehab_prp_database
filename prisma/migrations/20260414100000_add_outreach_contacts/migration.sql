-- Add outreach / marketing contact tracking.
--
-- Each row records one "we called this patient about X" event so the
-- outreach list pages can filter out already-contacted patients (or
-- mark them with a badge). Distinct from FollowUpCall which is
-- appointment-scoped clinical reminder calls.

-- 1. Enum type
CREATE TYPE "OutreachReason" AS ENUM (
  'DORMANT',
  'PACKAGE_FINISHED',
  'NO_SHOW',
  'INCOMPLETE_PACKAGE',
  'OTHER'
);

-- 2. Table
CREATE TABLE "OutreachContact" (
  "id"            TEXT NOT NULL,
  "patientId"     TEXT NOT NULL,
  "reason"        "OutreachReason" NOT NULL,
  "contactedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactedById" TEXT NOT NULL,
  "outcome"       TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes
CREATE INDEX "OutreachContact_patientId_reason_contactedAt_idx"
  ON "OutreachContact"("patientId", "reason", "contactedAt");

CREATE INDEX "OutreachContact_reason_contactedAt_idx"
  ON "OutreachContact"("reason", "contactedAt");

-- 4. Foreign keys
ALTER TABLE "OutreachContact"
  ADD CONSTRAINT "OutreachContact_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutreachContact"
  ADD CONSTRAINT "OutreachContact_contactedById_fkey"
  FOREIGN KEY ("contactedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
