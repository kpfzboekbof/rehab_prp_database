/**
 * Display name shown in the page title, login screen, header, and
 * dashboard greeting. The default value is intentionally generic so the
 * GitHub source code does not identify any particular clinic.
 *
 * To brand the deployed instance, set the environment variable
 *   NEXT_PUBLIC_CLINIC_NAME="<your clinic name>"
 * in Vercel (or in `.env` for local dev). The `NEXT_PUBLIC_` prefix is
 * required so the value is available to client components — Next.js
 * inlines it at build time.
 */
export const CLINIC_NAME =
  process.env.NEXT_PUBLIC_CLINIC_NAME?.trim() || "PRP 病人管理系統";

/**
 * Longer descriptive form for `<head>` description / metadata.
 */
export const CLINIC_DESCRIPTION =
  process.env.NEXT_PUBLIC_CLINIC_DESCRIPTION?.trim() ||
  "復健科自費 PRP 病人追蹤與管理系統";
