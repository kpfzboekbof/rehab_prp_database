import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Keep-alive endpoint pinged by Vercel Cron every 4 minutes to prevent
 * Neon's free-tier compute from suspending. The Neon "scale to zero"
 * behaviour kicks in after ~5 min of inactivity; the first request
 * after suspension takes 500-2000ms to wake up, which is very visible
 * to clinic staff opening the dashboard.
 *
 * This route does a trivial one-row read that forces Prisma to open
 * (or reuse) a pooled connection to Neon. If the DB is reachable,
 * returns 200 with `{ok: true}`. If anything throws, returns 503 so
 * Vercel Cron logs a failure we can see.
 *
 * The route is intentionally unauthenticated — the body returned is
 * just a health signal and leaks nothing. Vercel Cron adds an
 * `x-vercel-cron` header but we do not strictly require it because
 * a spurious ping is harmless.
 */
export async function GET() {
  try {
    // `$queryRaw` with a constant expression is the cheapest possible
    // round-trip to Postgres — no table scan, no parsing of our schema.
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[ping] db unreachable", err);
    return NextResponse.json(
      { ok: false, error: "db unreachable" },
      { status: 503 },
    );
  }
}
