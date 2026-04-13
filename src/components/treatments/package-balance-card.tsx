import { formatTWD } from "@/lib/currency";
import type { PackageBalance } from "@/server/queries/treatments";

interface PackageBalanceCardProps {
  balances: PackageBalance[];
}

/**
 * Renders the patient's prepaid package balances. Returns null if the
 * patient has never bought a package — keep it out of the layout entirely
 * for those patients to avoid empty-state clutter.
 */
export function PackageBalanceCard({ balances }: PackageBalanceCardProps) {
  // Hide balances with totalPurchased == 0 (we may have included them just
  // for the form UI, but they shouldn't show on the patient detail page).
  const visible = balances.filter((b) => b.totalPurchased > 0);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-md border border-purple-200 bg-purple-50/50 p-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-purple-900">預付套組餘額</div>
      </div>
      <div className="mt-3 space-y-2">
        {visible.map((b) => {
          const danger = b.remaining <= 0;
          const low = b.remaining > 0 && b.remaining <= 2;
          return (
            <div
              key={b.productId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-purple-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-900">
                  {b.productName}
                  <span className="ml-1 text-xs text-neutral-500">
                    （{b.packageSize} 瓶 · 整套 {formatTWD(b.unitPrice)}，平均每瓶{" "}
                    {formatTWD(Math.round(b.unitPrice / b.packageSize))}）
                  </span>
                </div>
                <div className="text-xs text-neutral-600">
                  累計購入 {b.totalPurchased} 瓶 · 已使用 {b.totalUsed} 瓶
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">剩餘</div>
                <div
                  className={
                    "text-2xl font-semibold " +
                    (danger
                      ? "text-neutral-400"
                      : low
                        ? "text-amber-600"
                        : "text-purple-900")
                  }
                >
                  {b.remaining}
                  <span className="ml-1 text-sm font-normal">瓶</span>
                </div>
                {danger && (
                  <div className="text-[10px] text-neutral-500">已用罄</div>
                )}
                {low && (
                  <div className="text-[10px] text-amber-600">即將用完</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
