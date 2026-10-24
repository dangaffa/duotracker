import type { Metadata } from "next";
import Link from "next/link";
import { DuoFold } from "@/components/duo/DuoFold";
import type { DuoStatus } from "@/lib/status";

export const metadata: Metadata = {
  title: "About",
  description: "What each DuoTracker rating means, illustrated.",
};

const DETAILS: Record<DuoStatus, string[]> = {
  unoptimized: [
    "Open: an iPhone-sized window sits in the middle of the inner display, with dead space on both sides.",
    "Closed: it keeps away from the status bar on the right side.",
    "Nothing about the layout changes when you unfold the phone.",
  ],
  ios27: [
    "The app resizes to fill the display but stops at a rounded edge before the status bar on the right.",
    "It's still a single phone column, just wider: rows stretch out and leave a lot of empty space.",
    "Like a fully unoptimized app, it never reaches the status bar, so nothing covers its controls.",
  ],
  duo_issues: [
    "The app reaches the right edge, behind the status bar, and often uses a multi-column layout.",
    "But some of its controls sit where the status bar, outer camera, or Dynamic Island are, so they're hard or impossible to tap.",
    "Often worst while a Live Activity is running, when the Dynamic Island grows and pushes the status bar down.",
  ],
  duo: [
    "The app runs edge to edge with a layout designed for the wide inner display.",
    "Its toolbar sits below the status bar and moves down when the Dynamic Island expands; its tab bar sits at the bottom of the right edge.",
    "On the outer display, the toolbar sits below the camera.",
  ],
};

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <section className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">About DuoTracker</h1>
        <p className="text-muted">
          The iPhone Duo folds open into a display much wider than any iPhone app was built for, and apps handle that
          very differently. DuoTracker is a community list of how well each one copes, a bit like ProtonDB.
        </p>
        <p className="text-muted">
          Every app gets one of four ratings. The drawings use a made-up notes app; pick a rating, then open and close
          the phone to see how it looks on the outer and inner displays.
        </p>
      </section>

      <section aria-label="Interactive comparison">
        <DuoFold details={DETAILS} />
      </section>

      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="text-xl font-bold">Contributing</h2>
        <p className="max-w-2xl text-muted">
          Spotted an app that&apos;s been updated, or one that isn&apos;t listed? Send a suggestion. No account needed;
          each one is reviewed before it shows up.
        </p>
        <Link href="/submit" className="btn btn-primary">
          Suggest a change
        </Link>
      </section>
    </div>
  );
}
