-- Add session (早診 / 午診 / 晚診) to FollowUpAppointment, and normalise
-- existing scheduledAt values to Taipei-midnight of their day.
--
-- The application code now treats `scheduledAt` as a date-only field
-- (time component meaningless) and `session` as the explicit time-of-day
-- indicator.

-- 1. New enum type.
CREATE TYPE "AppointmentSession" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- 2. Add the column with a safe default so the NOT NULL constraint is
--    satisfied on existing rows.
ALTER TABLE "FollowUpAppointment"
  ADD COLUMN "session" "AppointmentSession" NOT NULL DEFAULT 'MORNING';

-- 3. Backfill: map each existing row to a session based on the Taipei
--    wall-clock hour stored in its scheduledAt.
--      00:00 – 11:59  → MORNING   (already the default, no update needed)
--      12:00 – 17:59  → AFTERNOON
--      18:00 – 23:59  → EVENING
UPDATE "FollowUpAppointment"
SET "session" = 'AFTERNOON'::"AppointmentSession"
WHERE EXTRACT(HOUR FROM ("scheduledAt" AT TIME ZONE 'Asia/Taipei'))::int BETWEEN 12 AND 17;

UPDATE "FollowUpAppointment"
SET "session" = 'EVENING'::"AppointmentSession"
WHERE EXTRACT(HOUR FROM ("scheduledAt" AT TIME ZONE 'Asia/Taipei'))::int >= 18;

-- 4. Normalise scheduledAt to Taipei midnight of the same day.
--    This collapses the time component so all downstream queries and
--    comparisons work on dates only.
UPDATE "FollowUpAppointment"
SET "scheduledAt" = ((("scheduledAt" AT TIME ZONE 'Asia/Taipei')::date)::timestamp AT TIME ZONE 'Asia/Taipei');
