import { STATUS_META, type DuoStatus } from "@/lib/status";

/*
 * The rating, drawn as the inner display: how much of the screen the app
 * actually gets. 34×24 grid, roughly the inner display's proportions.
 *
 *   unoptimized  narrow iPhone column in the middle
 *   ios27        fills up to the status bar on the right
 *   duo_issues   fills everything, but the island bites into a control
 *   duo          fills everything, toolbar stacked neatly on the right edge
 */
export function RatingGlyph({ status, size = 20 }: { status: DuoStatus; size?: number }) {
  const c = STATUS_META[status].color;
  return (
    <svg
      width={size * (34 / 24)}
      height={size}
      viewBox="0 0 34 24"
      aria-hidden
      className="shrink-0"
      style={{ overflow: "visible" }}
    >
      <rect x="1" y="1" width="32" height="22" rx="4" fill="none" stroke={c} strokeWidth="1.6" />
      {status === "unoptimized" && <rect x="12" y="1" width="10" height="22" rx="2" fill={c} />}
      {status === "ios27" && <path d="M5 1h17a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4z" fill={c} />}
      {status === "duo_issues" && (
        <>
          <rect x="1" y="1" width="32" height="22" rx="4" fill={c} />
          <circle cx="27" cy="7" r="5.2" fill="var(--background)" />
        </>
      )}
      {status === "duo" && (
        <>
          <rect x="1" y="1" width="32" height="22" rx="4" fill={c} />
          <rect x="25.5" y="4" width="5" height="5" rx="2.5" fill="var(--background)" />
          <rect x="25.5" y="11" width="5" height="9" rx="2.5" fill="var(--background)" />
        </>
      )}
    </svg>
  );
}
