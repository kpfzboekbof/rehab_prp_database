import { MonthCalendar } from "@/components/calendar/month-calendar";
import { DayPanel } from "@/components/calendar/day-panel";
import { taipeiDateKey } from "@/lib/date";
import {
  listAppointmentsForDay,
  listAppointmentsForMonth,
} from "@/server/queries/appointments";
import { requireSession } from "@/server/rbac";

interface CalendarPageProps {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  await requireSession();
  const { year: yearParam, month: monthParam, day: dayParam } = await searchParams;

  // Default to current Taipei month.
  const now = new Date();
  const todayKey = taipeiDateKey(now);
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);

  const year = Number.parseInt(yearParam ?? "", 10) || todayYear;
  const month = Number.parseInt(monthParam ?? "", 10) || todayMonth;
  const validMonth = month >= 1 && month <= 12 ? month : todayMonth;

  const selectedDay = (() => {
    if (dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)) return dayParam;
    // If we're looking at the month that contains today, default-select today.
    if (year === todayYear && validMonth === todayMonth) return todayKey;
    // Otherwise select the 1st of the shown month.
    return `${year}-${String(validMonth).padStart(2, "0")}-01`;
  })();

  const [monthAppointments, dayAppointments] = await Promise.all([
    listAppointmentsForMonth(year, validMonth),
    listAppointmentsForDay(selectedDay),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">回診日曆</h1>
        <p className="mt-1 text-sm text-neutral-600">
          所有病人的 PRP 回診排程。點擊日期查看當日詳情。
        </p>
      </div>

      <MonthCalendar
        year={year}
        month={validMonth}
        selectedDate={selectedDay}
        appointments={monthAppointments.map((a) => ({
          id: a.id,
          scheduledAt: a.scheduledAt,
          session: a.session,
          status: a.status,
          patient: { id: a.patient.id, name: a.patient.name },
        }))}
      />

      <DayPanel
        date={selectedDay}
        appointments={dayAppointments.map((a) => ({
          id: a.id,
          scheduledAt: a.scheduledAt,
          session: a.session,
          status: a.status,
          reason: a.reason,
          patient: {
            id: a.patient.id,
            name: a.patient.name,
            chartNumber: a.patient.chartNumber,
            phone: a.patient.phone,
          },
          followUpCall: a.followUpCall,
        }))}
      />
    </div>
  );
}
