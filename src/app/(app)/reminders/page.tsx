import { ReminderCard } from "@/components/reminders/reminder-card";
import {
  listCompletedReminders,
  listDueReminders,
} from "@/server/queries/reminders";
import { requireSession } from "@/server/rbac";

export default async function RemindersPage() {
  await requireSession();

  const [due, completed] = await Promise.all([
    listDueReminders(),
    listCompletedReminders(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">回診提醒</h1>
        <p className="mt-1 text-sm text-neutral-600">
          近期需要電話提醒的病人。點「開始電訪」後填寫通話結果，完成後會自動更新排程狀態。
        </p>
      </div>

      {/* Due list */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-medium text-neutral-900">
            待電訪
            <span className="ml-2 text-sm font-normal text-neutral-500">
              {due.length > 0 ? `共 ${due.length} 位` : "目前沒有需要提醒的病人"}
            </span>
          </h2>
          <span className="text-xs text-neutral-400">
            範圍：過去 3 天至未來 14 天
          </span>
        </div>

        {due.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
            目前沒有需要電訪的病人 ✓
          </div>
        ) : (
          <div className="space-y-3">
            {due.map((row) => (
              <ReminderCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      {/* Completed list */}
      {completed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-medium text-neutral-900">
              已電訪
              <span className="ml-2 text-sm font-normal text-neutral-500">
                近 30 天共 {completed.length} 位
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {completed.map((row) => (
              <ReminderCard key={row.id} row={row} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
