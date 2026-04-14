/**
 * Instant skeleton for the /analytics hub. Cached via
 * unstable_cache(countOutreachLists) so in practice this is only
 * visible on a cold cache — after the first hit in a 5-min window
 * the page snaps open.
 */
export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-neutral-200" />
      </div>

      {[0, 1].map((section) => (
        <section key={section} className="space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-64 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="h-36 animate-pulse rounded-lg border border-neutral-200 bg-white"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
