import { PlaceholderPage } from "@/components/placeholder-page";

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="使用者管理"
      description="新增醫師、員工帳號並設定角色"
      plannedFeatures={[
        "新增 / 停用使用者",
        "設定角色（DOCTOR / STAFF / ADMIN）",
        "重設密碼",
      ]}
    />
  );
}
