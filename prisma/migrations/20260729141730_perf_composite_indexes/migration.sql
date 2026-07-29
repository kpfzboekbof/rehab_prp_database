-- Performance: replace single-column indexes with the composites the hot
-- queries actually use. See prisma/schema.prisma for the per-index rationale.
--
-- Ordering note: the CREATEs come BEFORE the DROPs on purpose. Prisma
-- generates drop-then-create, which would leave the table briefly unindexed
-- on the dropped columns while the new index builds. Each new composite has
-- the dropped index's column as its leading column, so once it exists the
-- old one is pure redundancy and can go.
--
-- These are plain (non-CONCURRENT) CREATE INDEX statements: `prisma migrate`
-- wraps a migration in a transaction and CREATE INDEX CONCURRENTLY cannot run
-- inside one. Each takes a brief write lock — fine at this table size. If the
-- clinic's tables ever grow large enough for that to matter, run the CREATE
-- INDEX CONCURRENTLY statements by hand and mark this migration applied.

-- CreateIndex
CREATE INDEX "TreatmentRecord_patientId_treatmentDate_idx" ON "TreatmentRecord"("patientId", "treatmentDate");

-- CreateIndex
CREATE INDEX "TreatmentRecord_doctorId_treatmentDate_idx" ON "TreatmentRecord"("doctorId", "treatmentDate");

-- CreateIndex
CREATE INDEX "FollowUpAppointment_patientId_scheduledAt_idx" ON "FollowUpAppointment"("patientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUpAppointment_status_scheduledAt_idx" ON "FollowUpAppointment"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Patient_deletedAt_createdAt_idx" ON "Patient"("deletedAt", "createdAt");

-- DropIndex (superseded by the composites above)
DROP INDEX "TreatmentRecord_patientId_idx";

-- DropIndex
DROP INDEX "TreatmentRecord_doctorId_idx";

-- DropIndex
DROP INDEX "FollowUpAppointment_patientId_idx";

-- DropIndex
DROP INDEX "FollowUpAppointment_status_idx";

-- DropIndex
DROP INDEX "Patient_deletedAt_idx";
