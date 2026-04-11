import { PlaceholderPage } from "@/components/placeholder-page";

export default function CalendarPage() {
  return (
    <PlaceholderPage
      title="回診日曆"
      description="排程與檢視病人回診時間"
      plannedFeatures={[
        "月曆檢視與當日排程清單",
        "從治療紀錄快速建立回診排程",
        "預約狀態管理（已排程 / 已確認 / 已完成 / 未到 / 取消）",
      ]}
    />
  );
}
