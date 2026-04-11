# PRP 病人追蹤系統

復健科診所自費 PRP 病人追蹤與管理系統。M1（骨幹）版本——已完成資料庫 schema、驗證、Layout 與各功能區佔位頁面。實際 CRUD / 表單 / 報表 / 日曆 / 提醒 UI 會在後續 PR 一個一個補上。

## 技術棧

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS v4 + 手刻 shadcn 風格元件
- Prisma ORM + SQLite（檔案 `./data/prp.db`）
- Auth.js v5（`next-auth@beta`）+ Credentials + bcryptjs
- 三角色權限：`DOCTOR` / `STAFF` / `ADMIN`

## 本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 複製環境變數並產生 AUTH_SECRET
cp .env.example .env
# 編輯 .env，至少要設定 AUTH_SECRET：
#   openssl rand -base64 32

# 3. 建立資料庫與 migrations
npx prisma migrate dev --name init

# 4. 灌入種子資料（admin 帳號 + 範例 PRP 品項 + 預設抽成）
npm run db:seed

# 5. 啟動 dev server
npm run dev
```

打開 http://localhost:3000，以 `.env` 中 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`（預設 `admin@clinic.local` / `changeme`）登入。

## Docker 部署

```bash
cp .env.example .env
# 設定 AUTH_SECRET 與 SEED_ADMIN_* 環境變數

docker compose up --build
```

SQLite 資料檔案會掛載到宿主機的 `./data/prp.db`。Container 啟動時會自動跑 `prisma migrate deploy`，但**不會**自動跑 seed——首次部署後需要另外執行：

```bash
docker compose exec prp-dashboard node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

（或是自行透過 `docker compose exec` 進到 container 裡 `npm run db:seed`，視映像檔是否保留了 `tsx` 而定。）

## 專案結構

```
prisma/
  schema.prisma          # 完整資料模型（一次到位，後續 PR 不必改）
  seed.ts                # admin + 範例 PRP 品項 + 預設抽成
src/
  auth.ts                # Auth.js v5 NextAuth 設定
  proxy.ts               # Next 16 edge proxy（站台級登入護欄）
  server/rbac.ts         # requireSession / requireRole（server action 安全邊界）
  lib/
    db.ts                # Prisma singleton
    auth-helpers.ts
    date.ts              # zh-TW + Asia/Taipei 格式化
    currency.ts          # TWD 格式化
    body-parts.ts        # BodyPart enum 中文對照
    commission.ts        # 抽成計算
    utils.ts             # cn()
  components/
    ui/                  # 基礎元件（button / card / input / label）
    layout/              # AppShell / Sidebar / Header
    placeholder-page.tsx # 各佔位頁面共用
  app/
    layout.tsx           # RootLayout，zh-TW，Geist fonts
    page.tsx             # redirect /dashboard
    login/page.tsx       # 登入頁
    api/auth/[...nextauth]/route.ts
    (app)/               # 登入後的路由組（由 layout 統一擋登入）
      layout.tsx
      dashboard/page.tsx
      patients/page.tsx
      calendar/page.tsx
      reminders/page.tsx
      reports/monthly/page.tsx
      research/page.tsx
      admin/
        layout.tsx       # ADMIN only
        users/page.tsx
        products/page.tsx
        commission/page.tsx
```

## 資料模型速覽

- **User**（`Role`: DOCTOR / STAFF / ADMIN）
- **Patient**（`chartNumber` 手動輸入、`deletedAt` 軟刪除）
- **PRPProduct**（品項目錄、`unitPrice` 整數 TWD）
- **TreatmentRecord**（治療紀錄；`unitPriceSnapshot` / `totalAmount` / `commissionRateSnapshot` / `commissionAmount` 皆於建立時 freeze，月報表僅需聚合）
- **FollowUpAppointment**（回診排程）
- **FollowUpCall**（1:1 對應 Appointment；保留 `externalMessageId` / `channel` 給未來 LINE bot）
- **DoctorCommissionRate**（每醫師的抽成比例，含 `effectiveFrom` / `effectiveTo` 歷史）

詳見 `prisma/schema.prisma`。

## 後續規劃（Future PRs）

- **M2 — 臨床資料**：病人 CRUD、治療紀錄表單（含 snapshot 邏輯）、研究篩選 + 去識別化 CSV 匯出
- **M3 — 回診循環**：日曆元件、提醒清單、電話追蹤表單
- **M4 — 報表 + 管理**：月業績 + 抽成彙總、`/admin/*` 使用者/品項/抽成管理 UI
