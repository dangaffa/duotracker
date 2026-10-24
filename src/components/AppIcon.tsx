/* eslint-disable @next/next/no-img-element */
import type { App } from "@/lib/types";

/** App icon, or a lettered placeholder when none is set. */
export function AppIcon({ app, size = 44 }: { app: Pick<App, "name" | "icon_url">; size?: number }) {
  const radius = Math.round(size * 0.225);
  if (app.icon_url) {
    return (
      <img
        src={app.icon_url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 border border-border object-cover"
        style={{ borderRadius: radius }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center bg-surface-2 font-bold text-muted"
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.42 }}
    >
      {app.name.charAt(0).toUpperCase()}
    </span>
  );
}
