import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/server/rbac";

export default async function MonthlyReportPage() {
  await requireRole(["DOCTOR", "ADMIN"]);
  return (
    <PlaceholderPage
      title="月業績報表"
      description="依月份統計治療總額與醫師抽成"
      plannedFeatures={[
        "逐月統計治療筆數、總金額、醫師抽成",
        "以醫師為單位匯出 CSV",
        "圖表呈現（recharts）",
      ]}
    />
  );
}
