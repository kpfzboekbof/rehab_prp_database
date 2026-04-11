import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/server/rbac";

export default async function ResearchPage() {
  await requireRole(["DOCTOR", "ADMIN"]);
  return (
    <PlaceholderPage
      title="研究資料庫"
      description="依部位、年齡、性別、PRP 品項篩選並匯出去識別化資料"
      plannedFeatures={[
        "多欄位篩選（部位、年齡區間、性別、PRP 品項、日期區間）",
        "結果表格與統計摘要",
        "匯出去識別化 CSV（姓名、病歷號、生日皆隱藏）",
      ]}
    />
  );
}
