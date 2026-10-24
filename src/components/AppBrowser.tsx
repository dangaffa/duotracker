"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { STATUSES, STATUS_META, type DuoStatus } from "@/lib/status";
import { needsRecheck } from "@/lib/recheck";
import type { App } from "@/lib/types";
import { AppIcon } from "./AppIcon";
import { RatingGlyph } from "./RatingGlyph";

type SortKey = "name" | "rating" | "verified";

// Best first
const RANK: Record<DuoStatus, number> = Object.fromEntries(STATUSES.map((s, i) => [s, i])) as Record<DuoStatus, number>;

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function AppBrowser({ apps }: { apps: App[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DuoStatus | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<DuoStatus, number>;
    apps.forEach((a) => c[a.status]++);
    return c;
  }, [apps]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = apps.filter(
      (a) =>
        (filter === "all" || a.status === filter) &&
        (!q || a.name.toLowerCase().includes(q) || a.developer?.toLowerCase().includes(q)),
    );
    const cmp: Record<SortKey, (a: App, b: App) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      rating: (a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name),
      verified: (a, b) => b.verified_at.localeCompare(a.verified_at),
    };
    return filtered.sort((a, b) => cmp[sort.key](a, b) * sort.dir);
  }, [apps, query, filter, sort]);

  const header = (key: SortKey, label: string, className = "") => (
    <th className={`px-3 py-2 font-medium ${className}`} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))}
      >
        {label}
        <span aria-hidden className={sort.key === key ? "" : "invisible"}>
          {sort.dir === 1 ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="text-muted tabular-nums">{apps.length}</span>
        </FilterButton>
        {STATUSES.map((s) => (
          <FilterButton key={s} active={filter === s} onClick={() => setFilter(filter === s ? "all" : s)}>
            <RatingGlyph status={s} size={16} />
            {STATUS_META[s].short}
            <span className="text-muted tabular-nums">{counts[s]}</span>
          </FilterButton>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name or developer"
          className="field ml-auto !w-full !py-1 text-sm sm:!w-64"
          aria-label="Filter apps"
        />
      </div>

      <div className="overflow-x-auto border-y border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              {header("name", "App")}
              {header("rating", "Rating")}
              <th className="hidden px-3 py-2 font-medium md:table-cell">Version</th>
              {header("verified", "Verified", "hidden sm:table-cell")}
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => (
              <tr key={app.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2">
                <td className="px-3 py-1.5">
                  <Link href={`/apps/${app.slug}`} className="flex items-center gap-2.5">
                    <AppIcon app={app} size={22} />
                    <span className="font-semibold">{app.name}</span>
                    {app.developer && <span className="hidden truncate text-muted lg:inline">{app.developer}</span>}
                  </Link>
                </td>
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium" style={{ color: STATUS_META[app.status].color }}>
                    <RatingGlyph status={app.status} size={16} />
                    {STATUS_META[app.status].short}
                  </span>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-1.5 font-mono text-xs text-muted md:table-cell">
                  {app.app_version ?? "—"}
                  {needsRecheck(app) && (
                    <span
                      className="ml-2 font-sans font-semibold"
                      style={{ color: "var(--status-ios27)" }}
                      title={`Version ${app.store_version} is out; this rating may be out of date.`}
                    >
                      v{app.store_version} out
                    </span>
                  )}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-1.5 text-muted tabular-nums sm:table-cell">
                  {dateFmt.format(new Date(app.verified_at))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  No apps match.{" "}
                  <Link href="/submit?kind=new_app" className="font-semibold text-accent">
                    Suggest one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium ${
        active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
