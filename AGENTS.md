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
