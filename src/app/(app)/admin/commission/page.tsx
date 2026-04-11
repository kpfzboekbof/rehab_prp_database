import { PlaceholderPage } from "@/components/placeholder-page";

export default function AdminCommissionPage() {
  return (
    <PlaceholderPage
      title="抽成設定"
      description="維護每位醫師的抽成比例"
      plannedFeatures={[
        "新增抽成規則（醫師、比例、生效日）",
        "舊規則自動加上 effectiveTo，保留歷史",
        "提醒：抽成會 snapshot 在治療紀錄，改規則不會溯及既往",
      ]}
    />
  );
}
