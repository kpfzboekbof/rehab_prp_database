/**
 * Fallback shown during *every* navigation between authed pages. The shared
 * AppShell (header + bottom tab bar) stays mounted — only this content area
 * swaps to the spinner — so the app never looks frozen while the next page's
 * server component is fetching. Route segments with their own loading.tsx
 * (dashboard, analytics) override this with a tailored skeleton.
 *
 * The spinner fades in after a short delay so fast/prefetched navigations
 * don't flash a spinner for a few milliseconds.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex animate-[fadeIn_120ms_ease-in_150ms_both] flex-col items-center gap-3 text-sm text-neutral-500">
        <svg
          className="h-8 w-8 animate-spin text-[#1D697C]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth={3}
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
        載入中…
      </div>
    </div>
  );
}
