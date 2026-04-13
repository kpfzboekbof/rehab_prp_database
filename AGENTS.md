<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key renames / differences you are likely to trip on:

- **`middleware.ts` → `src/proxy.ts`.** Export is `export function proxy(request)`, not `middleware`. The matcher config shape is the same.
- Server actions are the default way to handle form submissions. Prefer them over `/api/*` routes for mutations. Use `/api/*` only for external integrations (webhooks, CSV export, Auth.js handlers).
- `searchParams` in page components is now a `Promise<...>`. You must `await` it.
<!-- END:nextjs-agent-rules -->

# Project-specific rules

- **Every server action and privileged route MUST call `requireSession()` or `requireRole([...])` from `@/server/rbac` as its first line.** The edge `proxy` only checks cookie presence — it is a UX guardrail, not a security boundary.
- **Snapshot fields on `TreatmentRecord` are immutable.** `unitPriceSnapshot`, `totalAmount`, `commissionRateSnapshot`, and `commissionAmount` are frozen on create. Never overwrite them in an update, and never retroactively recompute commission against current rates — the whole point is that the monthly report is a pure aggregation over immutable rows.
- **Soft-delete patients only.** Taiwan medical records must be retained 7 years (醫療法). Set `deletedAt`; never hard-delete `Patient` rows.
- **Render all dates in `Asia/Taipei`.** Store UTC, format through `src/lib/date.ts` helpers. Do not call `toLocaleString()` without `timeZone: 'Asia/Taipei'`.
- **TWD is integer.** No fractional cents in `unitPrice`, `totalAmount`, or `commissionAmount`. Use `formatTWD()` for display.
- **CSV exports are de-identified by default.** Use `ageAt(birthDate)` instead of exporting `birthDate`; hide `name` and `chartNumber` unless the action explicitly documents a PII mode.
- **Server action result convention.** On success, call `redirect()` (which throws `NEXT_REDIRECT` — the action never returns). On validation / business-logic failure, return `{ ok: false, error: string }`. Client forms consume this via `useActionState` and show inline errors. See `src/server/actions/patients.ts` for the canonical shape. `ActionState` type lives next to each action module. Follow this pattern for every new mutation (treatments, appointments, reminders, admin, …).
- **Database is PostgreSQL.** The app targets Postgres (Neon for Vercel preview; self-hosted Postgres for production). Use Postgres-specific features where appropriate:
  - `contains` searches must include `mode: "insensitive"` to be case-insensitive (Postgres default is case-sensitive, unlike SQLite).
  - Enum columns are native Postgres enum types — adding a value needs a migration.
  - Migrations live in `prisma/migrations/` and are applied via `prisma migrate deploy` (runtime) or `prisma migrate dev` (local schema iteration).
  - `DATABASE_URL` must point at a pooled connection (Neon pgBouncer); `DIRECT_URL` must point at the direct connection and is used only by Prisma Migrate.
- **Migrations are applied manually, not on Vercel build.** `vercel-build` only runs `prisma generate && next build`. We used to chain `prisma migrate deploy` into the build, but Neon free-tier compute cold-starts occasionally blew past Prisma's short connect timeout and failed the whole deploy. When you add a new migration:
  1. `npx prisma migrate dev --name <description>` against your local dev DB (creates the SQL file + applies locally).
  2. `npx prisma migrate deploy` against the production `DIRECT_URL` (applies the same SQL to Neon).
  3. Commit the migration and push. Vercel deploys only run `next build`, so the schema on Neon must already match what the new code expects by the time the deploy completes.
  If you forget step 2, the deploy will succeed but runtime queries against the missing column/table will throw. Test immediately after deploying a schema change.
- **Update the dashboard when you ship a feature.** `src/app/(app)/dashboard/page.tsx` has a `statForHref` switch that turns the "功能開發中" placeholder into a real one-line stat (count of patients, appointments, etc.). When you finish a feature page, add a case for its href so the dashboard card stops saying it's still under development. New features without a stat default back to the placeholder, so this is required, not optional.
