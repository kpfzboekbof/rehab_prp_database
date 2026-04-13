# PRP 病人管理系統

復健科自費 PRP 病人追蹤與管理系統。Next.js 16 / Prisma / PostgreSQL，可部署到 Vercel + Neon 或自架 Docker。

> **品牌化**：要在部署的網站顯示自家診所名稱，設定環境變數 `NEXT_PUBLIC_CLINIC_NAME`（與選用的 `NEXT_PUBLIC_CLINIC_DESCRIPTION`）即可，不必改 source code。預設值是 generic 的「PRP 病人管理系統」。

## 技術棧

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS v4 + shadcn 風格元件
- Prisma ORM + **PostgreSQL**（Neon 雲端 / 自架 Postgres 皆可）
- Auth.js v5（`next-auth@beta`）+ Credentials + bcryptjs
- 三角色權限：`DOCTOR` / `STAFF` / `ADMIN`

---

## 首次部署到 Vercel + Neon（預覽用）

> **重要提醒**：雲端預覽環境**只放測試假資料**，不要輸入真實病人個資。正式上線請見下方「自架部署」章節，使用院內伺服器。

### 步驟 1：建立 Neon Postgres 資料庫

1. 到 https://neon.tech 用 GitHub 或 Google 帳號註冊
2. 建立 project，名字例如 `rehab-prp`，region 選 `AWS ap-northeast-1 (Tokyo)`（最接近台灣）
3. 建好後到 Dashboard → **Connection Details**，你需要複製**兩條** connection string：
   - **Pooled connection**（host 會有 `-pooler` 字樣）→ 這是 `DATABASE_URL`
   - **Direct connection**（host 沒有 `-pooler`）→ 這是 `DIRECT_URL`
4. （選用）建立一個 dev branch：在 Neon Dashboard → Branches → New branch，命名 `dev`。本機開發時可以用 dev branch 的連線字串，避免影響 preview 的資料。

### 步驟 2：套用 migrations 並灌入種子資料

在你本機的 repo 目錄：

```bash
# 建立 .env 檔（還不要 commit）
cp .env.example .env
# 編輯 .env，貼上 Neon 的兩條連線字串
# DATABASE_URL=... (pooled)
# DIRECT_URL=...   (direct)
# AUTH_SECRET=... (openssl rand -base64 32)

# 套用 migrations 到 Neon
npx prisma migrate deploy

# 灌入 admin 帳號 + 範例 PRP 品項 + 預設抽成
npm run db:seed
```

### 步驟 3：部署到 Vercel

1. 到 https://vercel.com 用 GitHub 帳號登入
2. Dashboard → **Add New → Project** → 選擇 `kpfzboekbof/rehab_prp_database` repo
3. Framework Preset 會自動偵測為 Next.js，保持預設
4. 展開 **Environment Variables**，依序加入：
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon 的 **pooled** 連線字串 |
   | `DIRECT_URL` | Neon 的 **direct** 連線字串 |
   | `AUTH_SECRET` | 跟本機 `.env` 同一組 |
   | `AUTH_TRUST_HOST` | `true` |
5. 按 **Deploy**，等 2–3 分鐘跑完
6. 打開 Vercel 給的網址（`https://xxx.vercel.app`），用 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 登入

之後每次 `git push` 到這個 branch 都會自動重新部署。

---

## 本地開發

### 選項 A：本機直接連 Neon（跟 Vercel 流程一樣最簡單）

```bash
npm install
cp .env.example .env
# 把 .env 裡的 DATABASE_URL / DIRECT_URL 換成 Neon dev branch 的連線字串
# 設定 AUTH_SECRET

npx prisma migrate deploy   # 或第一次用 prisma migrate dev
npm run db:seed
npm run dev
```

打開 http://localhost:3000，用 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 登入。

### 選項 B：本機用 Docker Postgres（offline 開發）

```bash
cp .env.example .env
# 把 .env 的 DATABASE_URL / DIRECT_URL 都改成：
#   postgres://prp:prp_dev_password@localhost:5432/prp
# 設定 AUTH_SECRET

docker run -d --name prp-pg \
  -e POSTGRES_USER=prp \
  -e POSTGRES_PASSWORD=prp_dev_password \
  -e POSTGRES_DB=prp \
  -p 5432:5432 \
  postgres:16-alpine

npx prisma migrate deploy
npm run db:seed
npm run dev
```

---

## 自架部署（院內伺服器）

未來若要在診所內部伺服器上線，使用附的 `docker-compose.yml`——同時起 Next.js + Postgres + volume。

```bash
cp .env.example .env
# 設定 AUTH_SECRET、SEED_ADMIN_* 環境變數
# （DATABASE_URL / DIRECT_URL 不用設，docker-compose 會自動指向內部 postgres）

docker compose up --build
```

首次部署後灌 seed：

```bash
docker compose exec prp-dashboard sh -c "node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts"
```

Postgres 資料落在 Docker volume `postgres_data`，請確保有定期備份。

---

## 專案結構

```
prisma/
  schema.prisma          # 資料模型（Postgres）
  migrations/
    20260411140000_init/migration.sql
  seed.ts                # admin + 範例 PRP 品項 + 預設抽成
src/
  auth.ts                # Auth.js v5 NextAuth 設定
  proxy.ts               # Next 16 edge proxy（站台級登入護欄）
  server/
    rbac.ts              # requireSession / requireRole
    queries/             # 唯讀邏輯
    actions/             # Server actions
  lib/
    db.ts                # Prisma singleton
    date.ts              # zh-TW + Asia/Taipei 格式化
    currency.ts          # TWD 格式化
    body-parts.ts        # BodyPart enum 中文對照
    commission.ts        # 抽成計算
    validation/          # zod schemas
  components/
    ui/                  # 基礎元件
    layout/              # AppShell / Sidebar / Header
    patients/            # 病人表單 / 表格 / 刪除按鈕
  app/
    layout.tsx / page.tsx / login/
    api/auth/[...nextauth]/route.ts
    (app)/               # 登入後的路由組
      layout.tsx         # 守衛登入
      dashboard/
      patients/
        page.tsx         # 列表 + 搜尋 + 分頁
        new/             # 新增
        [id]/            # 詳情
        [id]/edit/       # 編輯
      calendar/ reminders/ reports/ research/
      admin/             # ADMIN only
```

## 資料模型速覽

- **User**（`Role`: DOCTOR / STAFF / ADMIN）
- **Patient**（`chartNumber` 手動輸入、`deletedAt` 軟刪除）
- **PRPProduct**（品項目錄、`unitPrice` 整數 TWD）
- **TreatmentRecord**（治療紀錄；`unitPriceSnapshot` / `totalAmount` / `commissionRateSnapshot` / `commissionAmount` 皆於建立時 freeze）
- **FollowUpAppointment** / **FollowUpCall**（回診排程 + 電話追蹤）
- **DoctorCommissionRate**

## 後續規劃

- **M2 下一步**：治療紀錄表單（含 snapshot 邏輯）
- **M3**：日曆 / 提醒 / 通話紀錄
- **M4**：月業績報表 + `/admin/*` 管理 UI
