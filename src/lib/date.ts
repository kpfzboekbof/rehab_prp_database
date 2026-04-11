/**
 * Date helpers for the Taipei clinic.
 *
 * All dates are stored in UTC in the database. UI should always render
 * in `Asia/Taipei`. Never call `toLocaleString()` without a timeZone.
 */

const TAIPEI_TZ = "Asia/Taipei";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIPEI_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIPEI_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTW(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(d);
}

export function formatDateTimeTW(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return dateTimeFormatter.format(d);
}

/**
 * Turn a `YYYY-MM-DD` date input value into a UTC Date that represents
 * midnight in Taipei on that day. Avoids the "off by 8 hours" bug where
 * `new Date('2026-04-11')` returns midnight UTC rather than midnight TPE.
 */
export function taipeiDayStart(yyyyMmDd: string): Date {
  // 08:00 UTC = 00:00 (UTC-8)? No — Taipei is UTC+8, so 00:00 TPE = 16:00 UTC prior day.
  // The simplest robust approach is to parse YYYY-MM-DD and subtract 8 hours.
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  // Construct the wall-clock midnight in Taipei as an instant:
  // It equals 16:00 UTC of the previous calendar day.
  return new Date(Date.UTC(y, m - 1, d, -8, 0, 0, 0));
}

/**
 * Calculate a patient's age at a reference date (defaults to today),
 * rendered as an integer year count. Used by the de-identified CSV export.
 */
export function ageAt(birthDate: Date | string, referenceDate: Date = new Date()): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const mDiff = referenceDate.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}
