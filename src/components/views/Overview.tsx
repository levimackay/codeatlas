import { useGraphQuery, useChangesQuery, useScansQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { kindLabel } from "../../lib/kind-colors";
import { Icon } from "../icons/Icon";
import { StatusDot } from "../ui/StatusDot";
import { formatRelativeTime } from "../../lib/format";
import { EmptyState } from "../ui/EmptyState";
import type { ResourceKind } from "../../lib/types";

// Home. Summarizes what's real after a scan: counts by kind (zero shown as
// zero, never hidden), anything with error/unavailable_reason surfaced
// honestly, recent changes, and entry points into the other views. No
// stat-card grid — DESIGN.md explicitly bans that pattern, so counts are
// laid out as a dense labeled list, not tiles.
export function Overview() {
  const { data: graph, isLoading: graphLoading } = useGraphQuery();
  const { data: changes } = useChangesQuery(8);
  const { data: scans } = useScansQuery(1);
  const { navigate } = useNavigation();
  const latestScan = scans?.[0];

  const counts = new Map<ResourceKind, number>();
  if (graph) {
    for (const resource of Object.values(graph.resources)) {
      counts.set(resource.kind, (counts.get(resource.kind) ?? 0) + 1);
    }
  }
  const sortedCounts = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const problems = latestScan?.providers_run.filter((p) => p.error || !p.available) ?? [];

  if (!graphLoading && graph && Object.keys(graph.resources).length === 0) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <EmptyState
          title="No resources discovered yet"
          description="Run a scan from the header or the command palette (⌘K → Run scan) to build the first machine map."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 960 }}>
      <h1 className="text-display" style={{ margin: 0 }}>
        Overview
      </h1>

      <section>
        <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
          RESOURCES BY KIND
        </div>
        {sortedCounts.length === 0 ? (
          <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            No resources yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-1)" }}>
            {sortedCounts.map(([kind, count]) => (
              <div
                key={kind}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span style={{ color: `var(--kind-${kind})` }}>
                  <Icon name={kind} size={16} />
                </span>
                <span className="text-body-sm" style={{ flex: 1, color: "var(--text-secondary)" }}>
                  {kindLabel(kind)}
                </span>
                <span className="text-data" style={{ color: "var(--text-primary)" }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {problems.length > 0 && (
        <section>
          <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
            PROVIDER ISSUES ({problems.length})
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            {problems.map((p) => (
              <li
                key={p.provider_id}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)" }}
              >
                <StatusDot status={p.error ? "error" : "warning"} />
                <span className="text-data-sm" style={{ flexShrink: 0 }}>
                  {p.provider_id}
                </span>
                <span className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
                  {p.error ?? p.unavailable_reason ?? "unavailable"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <div className="text-label" style={{ color: "var(--text-tertiary)" }}>
            RECENT CHANGES
          </div>
          <button type="button" onClick={() => navigate("timeline")} className="text-label" style={{ color: "var(--accent-copper)" }}>
            View timeline
          </button>
        </div>
        {!changes || changes.length === 0 ? (
          <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            No changes recorded yet.
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
            {changes.map((c) => (
              <li key={c.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-hairline)" }}>
                <Icon name={c.resource_kind} size={16} />
                <span className="text-body-sm" style={{ flex: 1 }}>
                  <strong style={{ fontWeight: 500 }}>{c.resource_name}</strong> {c.summary}
                </span>
                <span className="text-data-sm" style={{ color: "var(--text-tertiary)" }}>
                  {formatRelativeTime(c.occurred_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
          JUMP TO
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {(
            [
              ["projects", "Projects"],
              ["graph", "Dependency Graph"],
              ["processes", "Processes & Ports"],
              ["docker", "Docker"],
              ["cleanup", "Cleanup Center"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              className="text-label-lg"
              style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
