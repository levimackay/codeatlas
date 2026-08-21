import { useMemo } from "react";
import { useChangesQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Icon } from "../icons/Icon";
import { EmptyState } from "../ui/EmptyState";
import { formatAbsoluteTime, formatDay } from "../../lib/format";
import type { ChangeEvent, ChangeKind } from "../../lib/types";

const KIND_LABEL: Record<ChangeKind, string> = {
  discovered: "discovered",
  removed: "removed",
  modified: "modified",
};

const KIND_COLOR: Record<ChangeKind, string> = {
  discovered: "var(--status-healthy)",
  removed: "var(--status-error)",
  modified: "var(--status-info)",
};

// listChanges(), chronological, grouped by day — DESIGN.md's dense-list
// pattern, not a card-per-event feed.
export function Timeline() {
  const { data: changes, isLoading } = useChangesQuery(200);
  const { selectResource } = useNavigation();

  const grouped = useMemo(() => {
    const groups = new Map<string, ChangeEvent[]>();
    for (const change of changes ?? []) {
      const dayKey = change.occurred_at.slice(0, 10);
      const list = groups.get(dayKey) ?? [];
      list.push(change);
      groups.set(dayKey, list);
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [changes]);

  if (isLoading) {
    return (
      <div className="text-body-sm" style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>
        Loading…
      </div>
    );
  }

  if (!changes || changes.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <EmptyState title="No changes recorded" description="Changes appear here once a second scan finds something new, removed, or modified." />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 800 }}>
      <h1 className="text-display" style={{ margin: 0 }}>
        Timeline
      </h1>
      {grouped.map(([day, events]) => (
        <section key={day}>
          <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
            {formatDay(events[0].occurred_at).toUpperCase()}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
            {events.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectResource(c.resource_id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) 0",
                    borderBottom: "1px solid var(--border-hairline)",
                    textAlign: "left",
                  }}
                >
                  <Icon name={c.resource_kind} size={16} />
                  <span className="text-body-sm" style={{ flex: 1, color: "var(--text-secondary)" }}>
                    <strong style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.resource_name}</strong>{" "}
                    <span style={{ color: KIND_COLOR[c.kind] }}>{KIND_LABEL[c.kind]}</span> — {c.summary}
                  </span>
                  <span className="text-data-sm" style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
                    {formatAbsoluteTime(c.occurred_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
