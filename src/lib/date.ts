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

const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIPEI_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Returns an ISO-style `YYYY-MM-DD` string for a Date, interpreted as the
 * wall-clock date in Taipei. Useful as a key when grouping UTC instants
 * into Taipei calendar days.
 */
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TAIPEI_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function taipeiDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return isoDateFormatter.format(d);
}

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

export function formatTimeTW(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return timeFormatter.format(d);
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
 * Exclusive end of a Taipei day — equals the start of the NEXT Taipei day.
 * Use together with `taipeiDayStart` for range queries: scheduledAt within
 * `[taipeiDayStart(d), taipeiDayEnd(d))` selects a single Taipei calendar
 * day regardless of storage timezone.
 */
export function taipeiDayEnd(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, -8, 0, 0, 0));
}

/**
 * Turn a `datetime-local` input value (`YYYY-MM-DDTHH:mm`) into a UTC
 * Date representing that wall-clock time in Taipei.
 */
export function taipeiDateTimeToUTC(value: string): Date {
  // "2026-04-13T14:30" → interpret as Taipei local → subtract 8 hours
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 8, mm, 0, 0));
}

/**
 * Turn a Date into a `datetime-local` input value in Taipei local time.
 * Used to populate edit forms with existing appointment times.
 */
export function utcToTaipeiDateTimeInput(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  // en-CA locale + timezone gives "2026-04-13, 14:30" — reshape to ISO-ish.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  // Guard against 24:00 from en-CA (should not happen but be safe).
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
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
