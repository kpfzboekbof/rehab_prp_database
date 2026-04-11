import { PlaceholderPage } from "@/components/placeholder-page";

export default function RemindersPage() {
  return (
    <PlaceholderPage
      title="回診提醒"
      description="產生提醒清單並記錄電話追蹤結果"
      plannedFeatures={[
        "列出今日 / 明日需提醒的病人",
        "電話追蹤表單：症狀改善、衛教完成、回診確認、病人回報",
        "未來：整合 LINE 聊天機器人自動發送提醒",
      ]}
    />
  );
}
