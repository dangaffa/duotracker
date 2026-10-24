import { STATUS_META, type DuoStatus } from "@/lib/status";
import { RatingGlyph } from "./RatingGlyph";

export function StatusBadge({ status, short = false }: { status: DuoStatus; short?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold" style={{ color: meta.color }}>
      <RatingGlyph status={status} size={16} />
      {short ? meta.short : meta.label}
    </span>
  );
}
