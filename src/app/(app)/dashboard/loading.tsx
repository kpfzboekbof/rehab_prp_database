/**
 * Instant skeleton shown while /dashboard is streaming. The real page
 * runs ~9 Prisma aggregates in parallel which, on a cold Neon compute,
 * can take a second or two to return — showing a shell here lets the
 * user see *something* immediately instead of a blank tab.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-16">
      {/* Greeting */}
      <header className="space-y-2">
        <div className="h-3 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 w-72 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-48 animate-pulse rounded bg-neutral-200" />
      </header>

      {/* Three skeleton sections roughly matching clinical / business / admin */}
      {[0, 1, 2].map((i) => (
        <section key={i} className="space-y-6">
          <div>
            <div className="h-10 w-48 animate-pulse rounded bg-neutral-200" />
            <div className="mt-3 h-0.5 w-24 bg-neutral-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="h-32 animate-pulse rounded-lg border border-neutral-200 bg-white"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
