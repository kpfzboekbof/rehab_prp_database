import type { NextConfig } from "next";

/**
 * Performance notes (see AGENTS.md for the query-budget rules that govern
 * the server side — this file is about the *client* side of "feels slow").
 *
 * Every route in this app is `ƒ` dynamic: they all read cookies via
 * `requireSession()`, so nothing is statically prerendered. That makes the
 * client router cache the single biggest lever on perceived speed, and the
 * Next.js defaults are tuned for content sites, not for an internal tool
 * where a nurse bounces between the same four pages all afternoon.
 */
const nextConfig: NextConfig = {
  output: "standalone",

  // Drop the `x-powered-by` header — a few bytes on every response.
  poweredByHeader: false,

  experimental: {
    /**
     * THE big one. `staleTimes.dynamic` defaults to **0** in Next 16, which
     * means the client router cache never reuses an already-rendered dynamic
     * segment. Every "上一頁" / back-button / re-click on 病人管理 pays a full
     * server round-trip (auth + Prisma + Neon latency) to re-render a page
     * the browser rendered ten seconds ago.
     *
     * 30s is deliberately conservative for a clinical app: a nurse who edits
     * a record and navigates back still sees fresh data, because every
     * mutating server action calls `revalidatePath()` on the affected routes,
     * and an explicit revalidation busts this cache immediately regardless of
     * the stale time. The 30s window only covers pure read-navigation.
     */
    staleTimes: {
      dynamic: 30,
      static: 300,
    },

    /**
     * By default, prefetching a *dynamic* route only fetches down to the
     * nearest `loading.tsx` boundary — i.e. we prefetch the spinner, not the
     * data, so every click still waits on the full server render. With
     * `dynamicOnHover`, hovering (or touch-starting) a link upgrades the
     * prefetch to the full route, so by the time the click lands the payload
     * is usually already in flight or done.
     *
     * Cost is bounded: it only fires on actual hover intent, not on every
     * link entering the viewport.
     */
    dynamicOnHover: true,

    /**
     * Tailwind v4 emits a small atomic stylesheet. Inlining it into <head>
     * removes a render-blocking round-trip on first paint, which is the
     * slowest moment on clinic wifi / 4G. Returning visitors lose the
     * separately-cached stylesheet, but our CSS is a few KB — the waterfall
     * costs more than the re-download.
     */
    inlineCss: true,

    /**
     * `recharts` and `lucide-react` are optimized by default; the Radix and
     * Base UI packages are not. Barrel imports from them pull in far more
     * modules than we actually use.
     */
    optimizePackageImports: [
      "@base-ui/react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
    ],
  },
};

export default nextConfig;
