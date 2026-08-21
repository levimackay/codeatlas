import type { ResourceKind } from "../../lib/types";
import { kindLabel } from "../../lib/kind-colors";
import { Icon } from "../icons/Icon";

// A small kind tag — DESIGN.md 4.5 radius-sm chip. Icon stroke stays
// text-secondary at rest per DESIGN.md 7 ("never a permanent full-
// saturation fill sitting in every table row"); only the label text and a
// thin left rule carry the kind-family color.
export function KindBadge({ kind, compact = false }: { kind: ResourceKind; compact?: boolean }) {
  return (
    <span
      className="text-caption"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: compact ? "1px 6px" : "2px 8px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-panel)",
        border: "1px solid var(--border-hairline)",
        color: "var(--text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={kind} size={16} />
      {!compact && kindLabel(kind)}
    </span>
  );
}
