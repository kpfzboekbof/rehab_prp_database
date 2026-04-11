import { PlaceholderPage } from "@/components/placeholder-page";

export default function AdminProductsPage() {
  return (
    <PlaceholderPage
      title="PRP 品項管理"
      description="管理 PRP 品項清單與單價"
      plannedFeatures={[
        "新增 / 編輯品項（名稱、單價、說明）",
        "停用不再使用的品項（不刪除，避免歷史紀錄斷鏈）",
      ]}
    />
  );
}
