export const STATUSES = ["duo", "duo_issues", "ios27", "unoptimized"] as const;

export type DuoStatus = (typeof STATUSES)[number];

export const STATUS_META: Record<
  DuoStatus,
  { label: string; short: string; blurb: string; color: string }
> = {
  duo: {
    label: "Designed for Duo",
    short: "Designed for Duo",
    blurb: "Uses the whole display with a layout built for the Duo, and keeps its controls clear of the camera, status bar, and Dynamic Island.",
    color: "var(--status-duo)",
  },
  duo_issues: {
    label: "Duo Optimized (with issues)",
    short: "Duo (issues)",
    blurb: "Fills the whole display, but some controls sit under the camera, status bar, or Dynamic Island.",
    color: "var(--status-duo-issues)",
  },
  ios27: {
    label: "iOS 27 Optimized",
    short: "iOS 27",
    blurb: "Resizes toward the edge of the display but stops before the status bar, and doesn't adapt its layout to the Duo.",
    color: "var(--status-ios27)",
  },
  unoptimized: {
    label: "Fully Unoptimized",
    short: "Unoptimized",
    blurb: "Runs in a letterboxed, iPhone-sized window in the middle of the display.",
    color: "var(--status-unoptimized)",
  },
};

export function isStatus(value: unknown): value is DuoStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}
