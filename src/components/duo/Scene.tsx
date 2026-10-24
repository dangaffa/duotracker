import type { ReactNode } from "react";
import { STATUS_META, type DuoStatus } from "@/lib/status";

/*
 * Schematic line drawings of an app on the iPhone Duo, in points.
 *
 * Geometry comes from Apple's iOS 27 UI Kit: the inner display is 951×669pt,
 * and both displays keep an 84pt-wide column along the right edge for the
 * system. It holds the vertical status bar (time over a battery ring); apps
 * designed for the Duo put their toolbar below it and their tab bar at the
 * bottom. Apple doesn't name the column as a whole, so neither does the copy.
 * The Dynamic Island sits at the top and pushes the status bar and toolbar
 * down while a Live Activity runs. The outer display has a physical camera
 * at the top of the column.
 *
 * The outer display is drawn 461.5pt wide (real: 466) so that it lines up
 * exactly with one half of the inner display in the fold animation.
 */

export const BEZEL = 14;
// Width of the system column along the right edge of both displays.
export const SIDE_W = 84;
// Display corner radius, measured from the device bezels (inner ≈53pt, outer ≈58pt); shared so both match.
export const RADIUS = 55;
export const INNER = { w: 951, h: 669, r: RADIUS };
export const OUTER = { w: 461.5, h: 669, rHinge: 8, rEdge: RADIUS };

export type Screen = "inner" | "outer";

export type SceneProps = {
  rating: DuoStatus;
  island: boolean;
  notes: boolean;
  ids: { hatch: string; clip: string };
};

const ink = "var(--ink)";
const paper = "var(--paper)";
const wash = "var(--wash)";
const wash2 = "var(--wash-2)";

/* ------------------------------------------------------------------------ */
/* Outlines                                                                 */
/* ------------------------------------------------------------------------ */

function roundedRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: number[]) {
  return [
    `M${x + tl} ${y}`,
    `H${x + w - tr}`,
    `A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}`,
    `V${y + h - br}`,
    `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}`,
    `H${x + bl}`,
    `A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}`,
    `V${y + tl}`,
    `A${tl} ${tl} 0 0 1 ${x + tl} ${y}`,
    "Z",
  ].join(" ");
}

export function screenPath(screen: Screen) {
  if (screen === "inner") {
    const r = INNER.r;
    return roundedRect(0, 0, INNER.w, INNER.h, [r, r, r, r]);
  }
  const { rHinge: a, rEdge: b } = OUTER;
  return roundedRect(0, 0, OUTER.w, OUTER.h, [a, b, b, a]);
}

export function bezelPath(screen: Screen) {
  const B = BEZEL;
  if (screen === "inner") {
    const r = INNER.r + B;
    return roundedRect(-B, -B, INNER.w + 2 * B, INNER.h + 2 * B, [r, r, r, r]);
  }
  const a = OUTER.rHinge + 4;
  const b = OUTER.rEdge + B;
  return roundedRect(-B, -B, OUTER.w + 2 * B, OUTER.h + 2 * B, [a, b, b, a]);
}

export function screenSize(screen: Screen) {
  return screen === "inner" ? INNER : OUTER;
}

/** Shared <defs>: the "unused space" hatch and the screen clip. */
export function SceneDefs({ screen, rating, ids }: { screen: Screen; rating: DuoStatus; ids: SceneProps["ids"] }) {
  return (
    <defs>
      <pattern id={ids.hatch} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="9" height="9" fill={paper} />
        <line x1="0" y1="0" x2="0" y2="9" stroke={STATUS_META[rating].color} strokeWidth="2.4" opacity=".55" />
      </pattern>
      <clipPath id={ids.clip}>
        <path d={screenPath(screen)} />
      </clipPath>
    </defs>
  );
}

/** Device body + screen + contents, in screen coordinates (origin = top-left of the display). */
export function Device({ screen, ...props }: SceneProps & { screen: Screen }) {
  return (
    <g>
      <path d={bezelPath(screen)} fill="var(--bezel)" stroke={ink} strokeWidth="1.6" />
      {screen === "outer" && (
        // Hinge edge
        <rect x={-BEZEL - 6} y={-BEZEL + 18} width="7" height={OUTER.h + 2 * BEZEL - 36} rx="3" fill="var(--bezel)" stroke={ink} strokeWidth="1.2" />
      )}
      <g clipPath={`url(#${props.ids.clip})`}>
        <rect x="0" y="0" width={screenSize(screen).w} height={screenSize(screen).h} fill={paper} />
        {screen === "inner" ? <InnerScene {...props} /> : <OuterScene {...props} />}
      </g>
      <path d={screenPath(screen)} fill="none" stroke={ink} strokeWidth="1.2" />
      {props.notes && (screen === "inner" ? <InnerNotes rating={props.rating} island={props.island} /> : <OuterNotes rating={props.rating} island={props.island} />)}
    </g>
  );
}

/* ------------------------------------------------------------------------ */
/* Scenes                                                                   */
/* ------------------------------------------------------------------------ */

function InnerScene({ rating, island, ids }: SceneProps) {
  const sideX = INNER.w - SIDE_W;
  const hatch = `url(#${ids.hatch})`;

  switch (rating) {
    case "unoptimized":
      return (
        <>
          <rect width={INNER.w} height={INNER.h} fill={hatch} />
          {/* A 375pt iPhone-width window, centred on the display */}
          <g>
            <rect x="288" y="0" width="375" height={INNER.h} rx="30" fill={paper} stroke={ink} strokeWidth="1" />
            <CompactApp x={288} w={375} />
          </g>
          <SideColumn x={sideX} topIdle={24} island={island} />
        </>
      );
    case "ios27":
      return (
        <>
          <rect x={sideX} width={SIDE_W} height={INNER.h} fill={hatch} />
          <path d={roundedRect(0, 0, sideX, INNER.h, [0, RADIUS, RADIUS, 0])} fill={paper} stroke={ink} strokeWidth="1" />
          <CompactApp x={0} w={sideX} />
          <SideColumn x={sideX} topIdle={24} island={island} />
        </>
      );
    case "duo_issues":
      return (
        <>
          <WideApp contentRight={INNER.w - 40} />
          {/* The app's own toolbar, pinned to the top-right corner and ignoring the status bar */}
          <ButtonColumn cx={sideX + SIDE_W / 2} top={26} count={3} />
          <TabColumn cx={sideX + SIDE_W / 2} h={INNER.h} />
          <SideColumn x={sideX} topIdle={24} island={island} />
        </>
      );
    case "duo":
      return (
        <>
          <WideApp contentRight={sideX - 28} />
          <SideColumn x={sideX} h={INNER.h} topIdle={24} island={island} buttons />
        </>
      );
  }
}

function OuterScene({ rating, island, ids }: SceneProps) {
  const sideX = OUTER.w - SIDE_W;
  const hatch = `url(#${ids.hatch})`;

  switch (rating) {
    case "unoptimized":
    case "ios27":
      // On the narrow outer display both behave the same: the app stops before the status bar.
      return (
        <>
          <rect x={sideX} width={SIDE_W} height={OUTER.h} fill={hatch} />
          <path d={roundedRect(0, 0, sideX, OUTER.h, [0, RADIUS, RADIUS, 0])} fill={paper} stroke={ink} strokeWidth="1" />
          <CompactApp x={0} w={sideX} />
          <SideColumn x={sideX} topIdle={72} island={island} lens />
        </>
      );
    case "duo_issues":
      return (
        <>
          <CompactApp x={0} w={OUTER.w} tabBar={false} />
          <TabColumn cx={sideX + SIDE_W / 2} h={OUTER.h} />
          <SideColumn x={sideX} topIdle={72} island={island} lens />
        </>
      );
    case "duo":
      return (
        <>
          <CompactApp x={0} w={sideX} headerButtons={false} tabBar={false} />
          <SideColumn x={sideX} h={OUTER.h} topIdle={72} island={island} lens buttons />
        </>
      );
  }
}

/* ------------------------------------------------------------------------ */
/* Right-edge column: status bar, Dynamic Island, toolbar, tab bar         */
/* ------------------------------------------------------------------------ */

// Where the status bar starts while a Live Activity is running, per display.
const ISLAND_STACK_TOP = { inner: 112, outer: 143 };

const EASE = "cubic-bezier(.3,.7,.2,1)";

function SideColumn({
  x,
  h,
  topIdle,
  island,
  lens = false,
  buttons = false,
}: {
  x: number;
  /** Display height; pass it to also draw the app's vertical tab bar at the bottom of the right edge. */
  h?: number;
  topIdle: number;
  island: boolean;
  lens?: boolean;
  buttons?: boolean;
}) {
  const cx = x + SIDE_W / 2;
  const top = island ? ISLAND_STACK_TOP[lens ? "outer" : "inner"] : topIdle;
  return (
    <g>
      {lens && <circle cx={cx} cy="45" r="21.5" fill="#050505" stroke={ink} strokeWidth="1" />}
      {/* The island stays mounted so it can grow out of the top edge when a Live Activity starts. */}
      <g
        className="duo-anim"
        style={{
          transformBox: "fill-box",
          transformOrigin: "50% 0%",
          transform: island ? "scaleY(1)" : "scaleY(0.35)",
          opacity: island ? 1 : 0,
          transition: `transform .5s ${EASE}, opacity .3s ease`,
        }}
      >
        {lens ? <OuterIsland cx={cx} /> : <Island cx={cx} />}
      </g>
      {/* Status bar and toolbar slide down together to make room for the island. */}
      <g className="duo-anim" style={{ transform: `translateY(${top - topIdle}px)`, transition: `transform .5s ${EASE}` }}>
        <StatusBar cx={cx} top={topIdle} />
        {buttons && <ButtonColumn cx={cx} top={topIdle + 98} count={3} capsule />}
      </g>
      {buttons && h && <TabColumn cx={cx} h={h} />}
    </g>
  );
}

/** Live Activity on the inner display: the island grows out of the top edge. */
function Island({ cx }: { cx: number }) {
  return (
    <g>
      <rect x={cx - 24} y="24" width="48" height="76" rx="24" fill="#050505" stroke={ink} strokeWidth="1" />
      <rect x={cx - 13} y="34" width="26" height="26" rx="7" fill="#5b6472" />
      <Waveform cx={cx} cy={79} />
    </g>
  );
}

/** Live Activity on the outer display: a tall capsule that wraps the camera. */
function OuterIsland({ cx }: { cx: number }) {
  return (
    <g>
      <rect x={cx - 22} y="22" width="44" height="114" rx="22" fill="#050505" stroke={ink} strokeWidth="1.4" />
      <circle cx={cx} cy="45" r="13" fill="#111" stroke="#2a2a2a" strokeWidth="1.5" />
      <rect x={cx - 11} y="74" width="22" height="22" rx="6" fill="#5b6472" />
      <Waveform cx={cx} cy={115} />
    </g>
  );
}

/** Now-playing bars; they bounce while the Live Activity is running (see .duo-wave in globals.css). */
function Waveform({ cx, cy }: { cx: number; cy: number }) {
  const hs = [5, 9, 6, 8];
  return (
    <g className="duo-wave">
      {[-8, -3, 2, 7].map((dx, i) => (
        <rect key={dx} x={cx + dx - 1.2} y={cy - hs[i]} width="2.4" height={hs[i] * 2} rx="1.2" fill="#e8e8e8" />
      ))}
    </g>
  );
}

/** The app's vertical tab bar (notes / folders / settings) at the bottom of the right edge. */
function TabColumn({ cx, h }: { cx: number; h: number }) {
  const step = 56;
  const height = step * 3 - 4;
  const top = h - 24 - height;
  return (
    <g>
      <rect x={cx - 24} y={top} width="48" height={height} rx="24" fill={wash} stroke={ink} strokeWidth="1" />
      <rect x={cx - 20} y={top + 4} width="40" height="44" rx="20" fill={wash2} />
      {(["note", "folder", "gear"] as const).map((g, i) => (
        <Glyph key={g} kind={g} cx={cx} cy={top + 26 + i * step} />
      ))}
    </g>
  );
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** iPhone Duo vertical status bar (48×86pt): time over a battery ring wrapped around wifi + cell. */
function StatusBar({ cx, top }: { cx: number; top: number }) {
  const cy = top + 58;
  const level = 0.56;
  const a0 = 140;
  const a1 = 400;
  return (
    <g>
      <text x={cx} y={top + 27} textAnchor="middle" fontSize="17" fontWeight="650" fill={ink} letterSpacing="-.3">
        9:41
      </text>
      <path d={arc(cx, cy, 19, a0, a1)} fill="none" stroke={ink} strokeOpacity=".22" strokeWidth="3.2" strokeLinecap="round" />
      <path d={arc(cx, cy, 19, a0, a0 + (a1 - a0) * level)} fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
      <text
        x={cx}
        y={cy - 15.5}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={ink}
        stroke={paper}
        strokeWidth="5"
        paintOrder="stroke"
      >
        56
      </text>
      <path d={arc(cx, cy + 4, 9.5, 225, 315)} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <path d={arc(cx, cy + 4, 5, 225, 315)} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx={cx} cy={cy + 4} r="1.8" fill={ink} />
      {[
        [9.3, 16.2],
        [3.3, 18.9],
        [-3.3, 18.9],
        [-9.3, 16.2],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r="2" fill={ink} opacity={i === 0 ? 0.3 : 1} />
      ))}
    </g>
  );
}

function ButtonColumn({ cx, top, count, capsule = false }: { cx: number; top: number; count: number; capsule?: boolean }) {
  const step = 56;
  return (
    <g>
      {capsule && <rect x={cx - 24} y={top} width="48" height={step * count - 4} rx="24" fill={wash} stroke={ink} strokeWidth="1" />}
      {Array.from({ length: count }, (_, i) => {
        const cy = top + 26 + i * step;
        return (
          <g key={i}>
            {!capsule && <circle cx={cx} cy={cy} r="21" fill={wash} stroke={ink} strokeWidth="1" />}
            <Glyph kind={(["compose", "search", "more"] as const)[i % 3]} cx={cx} cy={cy} />
          </g>
        );
      })}
    </g>
  );
}

function Glyph({ kind, cx, cy }: { kind: "compose" | "search" | "more" | "folder" | "note" | "gear"; cx: number; cy: number }) {
  const s = { fill: "none", stroke: ink, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (kind) {
    case "compose":
      return (
        <g {...s}>
          <path d={`M${cx - 1} ${cy - 8}h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6`} />
          <path d={`M${cx + 5} ${cy - 9}l3 3-8 8-4 1 1-4z`} />
        </g>
      );
    case "search":
      return (
        <g {...s}>
          <circle cx={cx - 2} cy={cy - 2} r="6" />
          <path d={`M${cx + 2.5} ${cy + 2.5}l5 5`} />
        </g>
      );
    case "more":
      return (
        <g fill={ink}>
          {[-7, 0, 7].map((d) => (
            <circle key={d} cx={cx + d} cy={cy} r="1.8" />
          ))}
        </g>
      );
    case "folder":
      return <path {...s} strokeWidth="1.6" d={`M${cx - 8} ${cy - 5}h5l2 2h9v9h-16z`} />;
    case "note":
      return <rect {...s} strokeWidth="1.6" x={cx - 6} y={cy - 8} width="12" height="15" rx="2" />;
    case "gear":
      return <circle {...s} strokeWidth="1.6" cx={cx} cy={cy - 1} r="6" />;
  }
}

/* ------------------------------------------------------------------------ */
/* The (made-up) app, in two layouts                                        */
/* ------------------------------------------------------------------------ */

function Line({ x, y, w, h = 6, tone = wash2 }: { x: number; y: number; w: number; h?: number; tone?: string }) {
  return <rect x={x} y={y} width={Math.max(w, 0)} height={h} rx={h / 2} fill={tone} />;
}

/** iPhone-style single column. Text widths are capped, so a stretched window shows its emptiness. */
function CompactApp({
  x,
  w,
  headerButtons = true,
  tabBar = true,
}: {
  x: number;
  w: number;
  headerButtons?: boolean;
  /** false when the tab bar is on the right edge instead */
  tabBar?: boolean;
}) {
  const cardW = w - 32;
  const textW = Math.min(cardW - 40, 300);
  const tabY = INNER.h - 74;
  const cards = tabBar ? [146, 222, 298, 374, 450, 526] : [146, 222, 298, 374, 450, 526, 602];
  return (
    <g>
      <Line x={x + 22} y={60} w={112} h={22} tone={ink} />
      {headerButtons && (
        <>
          <circle cx={x + w - 82} cy="71" r="17" fill={wash} stroke={ink} strokeWidth="1" />
          <Glyph kind="search" cx={x + w - 82} cy={71} />
          <circle cx={x + w - 40} cy="71" r="17" fill={wash} stroke={ink} strokeWidth="1" />
          <Glyph kind="compose" cx={x + w - 40} cy={71} />
        </>
      )}
      {[46, 70, 56, 52].reduce<{ el: ReactNode[]; at: number }>(
        (acc, cw, i) => {
          acc.el.push(
            <rect key={i} x={acc.at} y="106" width={cw} height="24" rx="12" fill={i === 0 ? ink : paper} stroke={ink} strokeWidth="1" />,
          );
          acc.at += cw + 8;
          return acc;
        },
        { el: [], at: x + 18 },
      ).el}
      {cards.map((y) => (
        <g key={y}>
          <rect x={x + 16} y={y} width={cardW} height="66" rx="12" fill={paper} stroke={ink} strokeWidth=".9" />
          <Line x={x + 30} y={y + 14} w={Math.min(110, cardW - 80)} h={10} tone={ink} />
          <Line x={x + 16 + cardW - 54} y={y + 16} w={38} />
          <Line x={x + 30} y={y + 35} w={textW} />
          <Line x={x + 30} y={y + 47} w={textW * 0.62} />
        </g>
      ))}
      {tabBar && (
        <>
          <rect x={x} y={tabY} width={w} height={INNER.h - tabY} fill={paper} />
          <line x1={x} x2={x + w} y1={tabY} y2={tabY} stroke={ink} strokeWidth="1" />
          {(["note", "folder", "gear"] as const).map((g, i) => {
            const cx = x + (w / 3) * (i + 0.5);
            return (
              <g key={g}>
                <Glyph kind={g} cx={cx} cy={tabY + 24} />
                <Line x={cx - 14} y={tabY + 40} w={28} h={5} />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
}

/** Two-column layout (note list + note) for the inner display. The tab bar is on the right edge. */
function WideApp({ contentRight }: { contentRight: number }) {
  const listX = 0;
  const docX = 380;
  const cx0 = docX + 36;
  const textW = contentRight - cx0;
  return (
    <g>
      <rect x="0" y="0" width={docX} height={INNER.h} fill={wash} opacity=".45" />

      {/* Note list */}
      <Line x={listX + 22} y={44} w={124} h={20} tone={ink} />
      <rect x={listX + 18} y="80" width={docX - listX - 36} height="30" rx="9" fill={wash} />
      <Glyph kind="search" cx={listX + 38} cy={95} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const y = 128 + i * 70;
        return (
          <g key={i}>
            {i === 0 && <rect x={listX} y={y} width={docX - listX} height="70" fill={wash} />}
            {i === 0 && <rect x={listX} y={y} width="4" height="70" fill={ink} />}
            <Line x={listX + 22} y={y + 16} w={[120, 96, 132, 104, 88, 116, 100][i]} h={9} tone={ink} />
            <Line x={docX - 64} y={y + 17} w={40} />
            <Line x={listX + 22} y={y + 34} w={290} />
            <Line x={listX + 22} y={y + 46} w={200} />
            <line x1={listX} x2={docX} y1={y + 70} y2={y + 70} stroke={ink} strokeOpacity=".25" strokeWidth="1" />
          </g>
        );
      })}
      <line x1={docX} x2={docX} y1="0" y2={INNER.h} stroke={ink} strokeWidth="1" />

      {/* Document */}
      <Line x={cx0} y={62} w={130} h={7} />
      <Line x={cx0} y={80} w={Math.min(250, textW)} h={26} tone={ink} />
      {[0, 1, 2, 3].map((i) => (
        <Line key={i} x={cx0} y={132 + i * 16} w={i === 3 ? textW * 0.55 : textW} />
      ))}
      <rect x={cx0} y="210" width={Math.min(300, textW)} height="160" rx="10" fill={wash} stroke={ink} strokeWidth="1" />
      <path
        d={`M${cx0} 210 L${cx0 + Math.min(300, textW)} 370 M${cx0 + Math.min(300, textW)} 210 L${cx0} 370`}
        stroke={ink}
        strokeOpacity=".2"
        strokeWidth="1"
      />
      {[0, 1, 2, 3].map((i) => {
        const y = 398 + i * 30;
        return (
          <g key={i}>
            <circle cx={cx0 + 9} cy={y + 9} r="8" fill={i < 2 ? ink : paper} stroke={ink} strokeWidth="1.4" />
            <Line x={cx0 + 28} y={y + 6} w={[110, 92, 120, 84][i]} />
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------------ */
/* Annotations                                                              */
/* ------------------------------------------------------------------------ */

function Note({
  x,
  y,
  children,
  rating,
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: string;
  rating: DuoStatus;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="19"
      fontWeight="650"
      fill={STATUS_META[rating].color}
      stroke={paper}
      strokeWidth="6"
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

function Ring({ cx, cy, r, rating }: { cx: number; cy: number; r: number; rating: DuoStatus }) {
  return <circle cx={cx} cy={cy} r={r} fill="none" stroke={STATUS_META[rating].color} strokeWidth="3.5" strokeDasharray="7 5" />;
}

function InnerNotes({ rating, island }: { rating: DuoStatus; island: boolean }) {
  const sideCx = INNER.w - SIDE_W / 2;
  const c = STATUS_META[rating].color;
  switch (rating) {
    case "unoptimized":
      return (
        <>
          <Note x={144} y={340} rating={rating}>unused</Note>
          <Note x={765} y={340} rating={rating}>unused</Note>
        </>
      );
    case "ios27":
      return (
        <>
          <path d={`M${INNER.w - SIDE_W} 300 v80`} stroke={c} strokeWidth="3" />
          <Note x={INNER.w - SIDE_W - 12} y={348} anchor="end" rating={rating}>stops before the status bar</Note>
          <Note x={560} y={254} rating={rating}>rows just stretch wider</Note>
        </>
      );
    case "duo_issues": {
      // The status bar always covers one of the app's buttons: the 2nd normally, the 3rd once the
      // island pushes it down. While a Live Activity runs, the island covers the 1st as well.
      const labelX = INNER.w - SIDE_W - 76;
      return (
        <>
          <Slide dy={island ? 56 : 0}>
            <Callout cx={sideCx} cy={108} labelX={labelX} rating={rating}>
              button under the status bar
            </Callout>
          </Slide>
          <Fade show={island}>
            <Callout cx={sideCx} cy={52} labelX={labelX} rating={rating}>
              button under the Dynamic Island
            </Callout>
          </Fade>
        </>
      );
    }
    case "duo":
      return (
        <Slide dy={island ? ISLAND_STACK_TOP.inner - 24 : 0}>
          <path d={`M${INNER.w - SIDE_W - 6} ${24 + 98} h-10 v164 h10`} fill="none" stroke={c} strokeWidth="3" />
          <Swap
            show={island}
            x={INNER.w - SIDE_W - 24}
            y={24 + 186}
            rating={rating}
            on="toolbar moves down with the island"
            off="toolbar below the status bar"
          />
        </Slide>
      );
  }
}

const SLIDE = ".5s cubic-bezier(.3,.7,.2,1)";

/** Moves annotations in step with the status bar and toolbar instead of jumping. */
function Slide({ dy, children }: { dy: number; children: ReactNode }) {
  return (
    <g className="duo-anim" style={{ transform: `translateY(${dy}px)`, transition: `transform ${SLIDE}` }}>
      {children}
    </g>
  );
}

function Fade({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <g className="duo-anim" style={{ opacity: show ? 1 : 0, transition: "opacity .35s ease" }}>
      {children}
    </g>
  );
}

/** Two alternative labels in the same spot, cross-fading instead of swapping text. */
function Swap({
  show,
  x,
  y,
  rating,
  on,
  off,
}: {
  show: boolean;
  x: number;
  y: number;
  rating: DuoStatus;
  on: string;
  off: string;
}) {
  return (
    <>
      <Fade show={!show}>
        <Note x={x} y={y} anchor="end" rating={rating}>{off}</Note>
      </Fade>
      <Fade show={show}>
        <Note x={x} y={y} anchor="end" rating={rating}>{on}</Note>
      </Fade>
    </>
  );
}

/** Dashed ring around a covered control, with a leader line out to its label. */
function Callout({
  cx,
  cy,
  labelX,
  rating,
  children,
}: {
  cx: number;
  cy: number;
  labelX: number;
  rating: DuoStatus;
  children: string;
}) {
  return (
    <>
      <Ring cx={cx} cy={cy} r={28} rating={rating} />
      <path d={`M${cx - 30} ${cy} H${labelX + 6}`} stroke={STATUS_META[rating].color} strokeWidth="2.5" />
      <Note x={labelX} y={cy + 6} anchor="end" rating={rating}>
        {children}
      </Note>
    </>
  );
}

function OuterNotes({ rating, island }: { rating: DuoStatus; island: boolean }) {
  const sideX = OUTER.w - SIDE_W;
  const c = STATUS_META[rating].color;
  switch (rating) {
    case "unoptimized":
    case "ios27":
      return (
        <>
          <path d={`M${sideX} 300 v80`} stroke={c} strokeWidth="3" />
          <Note x={sideX - 12} y={348} anchor="end" rating={rating}>stops before the status bar</Note>
        </>
      );
    case "duo_issues":
      return (
        <>
          <Ring cx={OUTER.w - 40} cy={71} r={28} rating={rating} />
          <Swap show={island} x={OUTER.w - 76} y={130} rating={rating} on="under the island" off="under the camera" />
        </>
      );
    case "duo":
      return (
        <Slide dy={island ? ISLAND_STACK_TOP.outer - 72 : 0}>
          <path d={`M${sideX - 6} ${72 + 98} h-10 v164 h10`} fill="none" stroke={c} strokeWidth="3" />
          <Note x={sideX - 24} y={72 + 186} anchor="end" rating={rating}>toolbar clear of the camera</Note>
        </Slide>
      );
  }
}
