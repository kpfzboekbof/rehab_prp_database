import Link from "next/link";
import type { AppointmentSession, AppointmentStatus } from "@prisma/client";

import { APPOINTMENT_SESSION_LABELS } from "@/lib/appointment-session";
import { statusIsDone } from "@/lib/appointment-status";
import { taipeiDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface MonthCalendarAppointment {
  id: string;
  scheduledAt: Date;
  session: AppointmentSession;
  status: AppointmentStatus;
  patient: { id: string; name: string };
}

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  selectedDate: string | null; // YYYY-MM-DD
  appointments: MonthCalendarAppointment[];
}

const MONTH_NAMES_ZH = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function todayInTaipeiKey(): string {
  return taipeiDateKey(new Date());
}

/**
 * Build a 6-week grid (42 cells) starting from the Sunday on or before
 * the 1st of the month. Each cell is a YYYY-MM-DD Taipei date string,
 * with a flag indicating whether it's in the target month.
 */
function buildGrid(year: number, month: number) {
  // First day of the target month in Taipei (use noon to avoid DST edges).
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 4, 0, 0)); // 12:00 Taipei = 04:00 UTC
  // Weekday of the 1st in the TAIPEI timezone — use toLocaleString to get Taipei weekday
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  }).format(firstOfMonth);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const firstWeekday = weekdayMap[weekdayStr] ?? 0;

  // Grid start: Sunday on or before the 1st.
  const gridStartDay = 1 - firstWeekday;

  const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const dayOffset = gridStartDay + i;
    // Build a Date for year-month-dayOffset (noon UTC to stay on the same day regardless of TZ math)
    const cellDate = new Date(Date.UTC(year, month - 1, dayOffset, 4, 0, 0));
    const key = taipeiDateKey(cellDate);
    const parts = key.split("-");
    const cellYear = Number(parts[0]);
    const cellMonth = Number(parts[1]);
    const cellDayOfMonth = Number(parts[2]);
    cells.push({
      key,
      day: cellDayOfMonth,
      inMonth: cellYear === year && cellMonth === month,
    });
  }
  return cells;
}

export function MonthCalendar({
  year,
  month,
  selectedDate,
  appointments,
}: MonthCalendarProps) {
  // Group appointments by Taipei date key
  const byDate = new Map<string, MonthCalendarAppointment[]>();
  for (const a of appointments) {
    const key = taipeiDateKey(a.scheduledAt);
    const arr = byDate.get(key);
    if (arr) arr.push(a);
    else byDate.set(key, [a]);
  }

  const cells = buildGrid(year, month);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const todayKey = todayInTaipeiKey();

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <Link
          href={{ pathname: "/calendar", query: { year: prevYear, month: prevMonth } }}
          className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          ← 上月
        </Link>
        <div className="text-base font-semibold">
          {year} 年 {MONTH_NAMES_ZH[month - 1]}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={{ pathname: "/calendar" }}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            本月
          </Link>
          <Link
            href={{ pathname: "/calendar", query: { year: nextYear, month: nextMonth } }}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            下月 →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-xs font-medium text-neutral-500">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-2",
              i === 0 && "text-red-500",
              i === 6 && "text-blue-500",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dayAppointments = byDate.get(cell.key) ?? [];
          const isSelected = cell.key === selectedDate;
          const isToday = cell.key === todayKey;
          const isSunday = i % 7 === 0;
          const isSaturday = i % 7 === 6;
          const rowLast = i >= 35;

          return (
            <Link
              key={cell.key + "-" + i}
              href={{
                pathname: "/calendar",
                query: { year, month, day: cell.key },
              }}
              className={cn(
                "group min-h-[96px] border-b border-r border-neutral-200 p-1.5 transition-colors",
                rowLast && "border-b-0",
                (i + 1) % 7 === 0 && "border-r-0",
                cell.inMonth ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/50",
                isSelected && "bg-blue-50 hover:bg-blue-100 ring-2 ring-inset ring-blue-400",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    !cell.inMonth && "text-neutral-400",
                    cell.inMonth && isSunday && "text-red-500",
                    cell.inMonth && isSaturday && "text-blue-500",
                    isToday && "bg-neutral-900 text-white",
                  )}
                >
                  {cell.day}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[10px] text-neutral-500">
                    {dayAppointments.length}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayAppointments.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[11px]",
                      statusIsDone(a.status)
                        ? "bg-neutral-100 text-neutral-500 line-through"
                        : "bg-blue-50 text-blue-800",
                    )}
                  >
                    {APPOINTMENT_SESSION_LABELS[a.session]} {a.patient.name}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="pl-1 text-[10px] text-neutral-500">
                    +{dayAppointments.length - 3} 更多
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
