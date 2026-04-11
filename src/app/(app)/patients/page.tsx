import { PlaceholderPage } from "@/components/placeholder-page";

export default function PatientsPage() {
  return (
    <PlaceholderPage
      title="病人管理"
      description="建立並管理 PRP 病人基本資料"
      plannedFeatures={[
        "新增 / 編輯病人基本資料（病歷號、姓名、性別、生日、聯絡方式）",
        "搜尋與分頁清單",
        "進入病人詳情頁查看治療紀錄與回診歷史",
        "軟刪除（保留 7 年病歷）",
      ]}
    />
  );
}
