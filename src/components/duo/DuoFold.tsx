"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { STATUSES, STATUS_META, type DuoStatus } from "@/lib/status";
import { RatingGlyph } from "@/components/RatingGlyph";
import { StatusBadge } from "@/components/StatusBadge";
import { BEZEL, Device, INNER, SceneDefs, type Screen } from "./Scene";

/*
 * The Duo folding open like a book. The cover (outer display on its front,
 * left half of the inner display on its back) swings around the hinge on its
 * left edge; the inner display stays put underneath, clipped to what is uncovered.
 *
 * Every face is the same full drawing, cropped with a viewBox, so the halves
 * line up exactly. Face boxes are (inner half + bezel) wide.
 */

const HALF = INNER.w / 2;
const FACE_W = HALF + BEZEL; // 489.5
const FACE_H = INNER.h + 2 * BEZEL; // 697
const STAGE_W = FACE_W * 2;

const ORDER = [...STATUSES].reverse() as DuoStatus[];

// Firefox flickers when 3D layers are nearly coplanar (the cover landing on the base) and
// with backface-visibility on nested faces, so it gets a more conservative setup.
const noopSubscribe = () => () => {};
function useIsFirefox() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /firefox\//i.test(navigator.userAgent),
    () => false,
  );
}

/** `details`: extra points shown under the device for whichever rating is selected. */
export function DuoFold({ details }: { details?: Record<DuoStatus, string[]> }) {
  const [rating, setRating] = useState<DuoStatus>("unoptimized");
  const [island, setIsland] = useState(false);
  const [open, setOpenState] = useState(0); // 0 = closed, 1 = open
  const openRef = useRef(0);
  const anim = useRef<number | null>(null);
  const pause = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const autoPlayed = useRef(false);
  const firefox = useIsFirefox();

  const setOpen = useCallback((v: number) => {
    openRef.current = v;
    setOpenState(v);
  }, []);

  const animateTo = useCallback(
    (target: number, { msPerUnit = 1100, then }: { msPerUnit?: number; then?: () => void } = {}) => {
      if (anim.current) cancelAnimationFrame(anim.current);
      if (pause.current) clearTimeout(pause.current);
      const from = openRef.current;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setOpen(target);
        return then?.();
      }
      const start = performance.now();
      const dur = msPerUnit * Math.abs(target - from) + 100;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setOpen(from + (target - from) * e);
        if (t < 1) anim.current = requestAnimationFrame(step);
        else then?.();
      };
      anim.current = requestAnimationFrame(step);
    },
    [setOpen],
  );

  /** Snap the new rating to closed (outer display), hold so it can be seen, then unfold. */
  const replay = useCallback(() => {
    if (anim.current) cancelAnimationFrame(anim.current);
    if (pause.current) clearTimeout(pause.current);
    setOpen(0);
    pause.current = setTimeout(() => animateTo(1), 1200);
  }, [animateTo, setOpen]);

  // Unfold once the first time the device scrolls into view.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoPlayed.current) {
          autoPlayed.current = true;
          setTimeout(() => animateTo(1), 500);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (anim.current) cancelAnimationFrame(anim.current);
    };
  }, [animateTo]);

  const angle = -180 * open;
  // Slide right as it opens, so the device stays centred.
  const shift = -25 * (1 - open);
  // Light falloff on the cover as it turns away.
  const shade = Math.sin(open * Math.PI) * 0.28;
  // Fully open, hide the cover and let the base show the whole display. Firefox switches a
  // few degrees early, before the cover gets close enough to the base to fight with it.
  const flat = open > (firefox ? 0.97 : 0.999);
  const moving = open > 0 && !flat;
  // How far the cover floats above the base. Firefox needs more separation.
  const lift = firefox ? 6 : 1;
  // Firefox: render only the face pointing at the viewer instead of relying on backface-visibility.
  const showFront = !firefox || open < 0.5;
  const showBack = !firefox || open >= 0.5;
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  // How much of the left half (as % of the stage) the base shows. Past 90° the cover lies over
  // the left half; its footprint is at least half-width × |cos θ| (perspective only makes it
  // bigger), so revealing a hair less than that keeps the extra area hidden under the cover.
  // The margin closes as it lands, so the base holds the complete left half by the end.
  const margin = 0.97 + 0.03 * clamp01((open - 0.9) / 0.1);
  const reveal = flat ? 50 : 50 * margin * Math.max(0, -Math.cos(open * Math.PI));

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Rating" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border text-sm">
        {ORDER.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={rating === s}
            onClick={() => {
              setRating(s);
              autoPlayed.current = true;
              replay();
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-2 font-semibold ${
              rating === s ? "text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
            style={rating === s ? { borderColor: STATUS_META[s].color } : undefined}
          >
            <RatingGlyph status={s} size={22} />
            {STATUS_META[s].short}
          </button>
        ))}
      </div>

      <div
        ref={stageRef}
        className="mx-auto w-full"
        style={{
          perspective: "2600px",
          // Fit the whole device on screen along with the tabs above and controls below,
          // including on wide-but-short screens like the Duo's own inner display.
          maxWidth: `min(48rem, calc((100svh - 190px) * ${STAGE_W / FACE_H}))`,
        }}
      >
        <div
          className="relative w-full"
          style={{
            aspectRatio: `${STAGE_W} / ${FACE_H}`,
            transformStyle: "preserve-3d",
            // A layout offset, not a transform: it snaps to whole pixels, so the drawing
            // isn't resampled (and blurred) at rest.
            left: `${shift}%`,
          }}
        >
          {/* Base: the whole inner display, clipped to the right half plus whatever the cover
              is currently lying over. The halves never meet at an edge, so there's no seam. */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 0 0 ${50 - reveal}%)`,
              // Closed, it's entirely under the cover; hiding it stops its edges peeking out.
              visibility: open < 0.005 ? "hidden" : undefined,
            }}
          >
            <Face screen="inner" half="full" rating={rating} island={island} notes={open > 0.97} />
          </div>

          {/* Cover */}
          <div
            className="absolute inset-y-0 left-1/2 w-1/2"
            style={{
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
              // At rest (fully closed) there's no 3D at all: even a 1px lift under perspective
              // scales the cover a hair and the browser resamples it, which looks fuzzy.
              transform: moving ? `translateZ(${lift}px) rotateY(${angle}deg)` : "none",
              visibility: flat ? "hidden" : undefined,
              // While moving, keep one rasterization for the whole swing instead of
              // re-rendering at a different sharpness every frame (which shimmers).
              willChange: moving ? "transform" : "auto",
            }}
          >
            {showFront && (
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                <Face screen="outer" rating={rating} island={island} notes={open < 0.03} />
                <Shade amount={shade} />
              </div>
            )}
            {showBack && (
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                {/* No shading here: it would leave a brightness step against the base as it lands. */}
                <Face screen="inner" half="left" rating={rating} island={island} notes={open > 0.97} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-3 text-sm">
        <div role="group" aria-label="Posture" className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 font-semibold">
          {(
            [
              [0, "Closed"],
              [1, "Open"],
            ] as const
          ).map(([target, label]) => {
            const active = target === 1 ? open > 0.5 : open <= 0.5;
            return (
              <button
                key={label}
                aria-pressed={active}
                onClick={() => animateTo(target)}
                className={`rounded-md px-4 py-1.5 ${active ? "bg-surface shadow-sm" : "text-muted hover:text-foreground"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-muted">
          <input type="checkbox" checked={island} onChange={(e) => setIsland(e.target.checked)} />
          Live Activity running
        </label>
      </div>

      <div className="mx-auto max-w-2xl space-y-3 border-t border-border pt-6">
        <StatusBadge status={rating} />
        <p className="text-muted">{STATUS_META[rating].blurb}</p>
        {details && (
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {details[rating].map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Face({
  screen,
  half,
  rating,
  island,
  notes,
}: {
  screen: Screen;
  half?: "left" | "full";
  rating: DuoStatus;
  island: boolean;
  notes: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const ids = { hatch: `h${uid}`, clip: `c${uid}` };
  
  return (
    <svg
      viewBox={`${-BEZEL} ${-BEZEL} ${half === "full" ? STAGE_W : FACE_W} ${FACE_H}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <SceneDefs screen={screen} rating={rating} ids={ids} />
      <Device screen={screen} rating={rating} island={island} notes={notes} ids={ids} />
    </svg>
  );
}

function Shade({ amount }: { amount: number }) {
  if (amount <= 0.001) return null;
  return <div className="pointer-events-none absolute inset-0 rounded-[6%] bg-black" style={{ opacity: amount }} />;
}
