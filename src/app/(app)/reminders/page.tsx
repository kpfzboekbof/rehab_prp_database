import { MiniCalendar } from "@/components/reminders/mini-calendar";
import { ReminderCard } from "@/components/reminders/reminder-card";
import { formatDateTW } from "@/lib/date";
import {
  REMINDER_LEAD_DAYS,
  appointmentDayForCallDay,
  getBusyCallDaysInMonth,
  listCompletedRemindersForCallDay,
  listDueRemindersForCallDay,
  todayCallDayKey,
} from "@/server/queries/reminders";
import { requireSession } from "@/server/rbac";

interface RemindersPageProps {
  searchParams: Promise<{
    date?: string;
    year?: string;
    month?: string;
  }>;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function RemindersPage({ searchParams }: RemindersPageProps) {
  await requireSession();
  const params = await searchParams;

  // Resolve selected call day.
  const today = todayCallDayKey();
  const selectedCallDay =
    params.date && DATE_KEY_RE.test(params.date) ? params.date : today;

  // Resolve the month the mini calendar shows. Default to the month of
  // the selected call day so context is consistent.
  const [selY, selM] = selectedCallDay.split("-").map(Number);
  const year = Number.parseInt(params.year ?? "", 10) || selY;
  const month = Number.parseInt(params.month ?? "", 10) || selM;
  const validMonth = month >= 1 && month <= 12 ? month : selM;

  const [due, completed, busyDays] = await Promise.all([
    listDueRemindersForCallDay(selectedCallDay),
    listCompletedRemindersForCallDay(selectedCallDay),
    getBusyCallDaysInMonth(year, validMonth),
  ]);

  const isToday = selectedCallDay === today;
  const apptDayKey = appointmentDayForCallDay(selectedCallDay);
  // Build a Date for formatting purposes (noon Taipei to avoid DST edges).
  const [cy, cm, cd] = selectedCallDay.split("-").map(Number);
  const callDayDate = new Date(Date.UTC(cy, cm - 1, cd, 4, 0, 0));
  const [ay, am, ad] = apptDayKey.split("-").map(Number);
  const apptDayDate = new Date(Date.UTC(ay, am - 1, ad, 4, 0, 0));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">回診提醒</h1>
        <p className="mt-1 text-sm text-neutral-600">
          提醒規則：預約日 <strong>前 {REMINDER_LEAD_DAYS} 天</strong>撥打電話。
          點「開始電訪」填寫通話結果，完成後會自動更新排程狀態。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: mini calendar + current call-day summary */}
        <div className="space-y-4">
          <MiniCalendar
            year={year}
            month={validMonth}
            selectedDate={selectedCallDay}
            busyDays={busyDays}
          />
          <div className="rounded-md border border-neutral-200 bg-white p-4 text-sm">
            <div className="text-xs text-neutral-500">
              {isToday ? "今天" : "檢視的電訪日"}
            </div>
            <div className="mt-1 text-lg font-semibold text-neutral-900">
              {formatDateTW(callDayDate)}
            </div>
            <div className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
              對應回診日
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-700">
              {formatDateTW(apptDayDate)}
            </div>
          </div>
        </div>

        {/* Right: due + completed lists */}
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-neutral-900">
              待電訪
              <span className="ml-2 text-sm font-normal text-neutral-500">
                {due.length > 0 ? `共 ${due.length} 位` : "本日無須電訪"}
              </span>
            </h2>
            {due.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">
                {completed.length > 0
                  ? "這一天的電訪都做完了 ✓"
                  : "這一天沒有需要電訪的病人"}
              </div>
            ) : (
              <div className="space-y-3">
                {due.map((row) => (
                  <ReminderCard key={row.id} row={row} />
                ))}
              </div>
            )}
          </section>

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-neutral-900">
                已電訪
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  共 {completed.length} 位
                </span>
              </h2>
              <div className="space-y-3">
                {completed.map((row) => (
                  <ReminderCard key={row.id} row={row} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
