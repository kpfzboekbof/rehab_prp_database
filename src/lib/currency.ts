const twdFormatter = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

export function formatTWD(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return twdFormatter.format(value);
}
