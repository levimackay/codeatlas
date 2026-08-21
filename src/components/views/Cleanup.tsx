import { useMemo, useState } from "react";
import { useCleanupCandidatesQuery, useGraphQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Icon } from "../icons/Icon";
import { EmptyState } from "../ui/EmptyState";
import { formatBytes, formatRelativeTime } from "../../lib/format";
import type { CleanupCandidate, CleanupCategory } from "../../lib/types";

const CATEGORY_LABELS: Record<CleanupCategory, string> = {
  unused_docker_image: "Unused Docker images",
  unused_docker_volume: "Unused Docker volumes",
  stale_build_artifact: "Stale build artifacts",
  cache: "Caches",
  unused_package_manager_artifact: "Unused package manager artifacts",
  stale_environment: "Stale environments",
  large_dependency_tree: "Large dependency trees",
  old_generated_file: "Old generated files",
};

async function copyPath(path: string) {
  try {
    await navigator.clipboard.writeText(path);
  } catch {
    // Clipboard access can fail in unusual embedding contexts; nothing
    // destructive happens either way, so this is safe to swallow.
  }
}

async function revealPath(path: string) {
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(path);
  } catch {
    // Falls back silently — Copy path always works as the guaranteed
    // affordance even if the platform's file manager can't be reached.
  }
}

// Cleanup Center — DESIGN.md + SECURITY.md's "never deletes anything in
// this release" rule. No delete button anywhere: every candidate gets
// Open in Finder/Explorer and Copy path, plus an explicit dependency
// warning whenever depended_on_by is non-empty — that warning is never
// hidden behind a summary count.
export function Cleanup() {
  const { data: candidates, isLoading } = useCleanupCandidatesQuery();
  const { data: graph } = useGraphQuery();
  const { selectResource } = useNavigation();
  const [openCategory, setOpenCategory] = useState<CleanupCategory | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<CleanupCategory, CleanupCandidate[]>();
    for (const c of candidates ?? []) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [candidates]);

  const totalBytes = (candidates ?? []).reduce((sum, c) => sum + (c.size_bytes ?? 0), 0);

  if (isLoading) {
    return (
      <div className="text-body-sm" style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>
        Loading…
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <EmptyState title="Nothing to clean up" description="No cleanup candidates were found in the last scan." />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 900 }}>
      <div>
        <h1 className="text-display" style={{ margin: 0 }}>
          Cleanup Center
        </h1>
        <p className="text-body-sm" style={{ margin: "var(--space-2) 0 0", color: "var(--text-tertiary)" }}>
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"} · {formatBytes(totalBytes)} reclaimable ·
          CodeAtlas does not delete anything for you yet — every item below is a recommendation, not an action.
        </p>
      </div>

      {grouped.map(([category, items]) => {
        const expanded = openCategory === null || openCategory === category;
        return (
          <section key={category}>
            <button
              type="button"
              onClick={() => setOpenCategory((c) => (c === category ? null : category))}
              className="text-panel-title"
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", textAlign: "left", padding: "var(--space-2) 0" }}
            >
              <Icon name={expanded ? "collapse" : "expand"} size={16} />
              {CATEGORY_LABELS[category]}
              <span className="text-data-sm" style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                ({items.length})
              </span>
            </button>

            {expanded && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
                {items.map((c) => (
                  <CandidateRow key={c.resource_id} candidate={c} graph={graph} onSelectDependent={selectResource} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CandidateRow({
  candidate,
  graph,
  onSelectDependent,
}: {
  candidate: CleanupCandidate;
  graph: ReturnType<typeof useGraphQuery>["data"];
  onSelectDependent: (id: string) => void;
}) {
  const hasDependents = candidate.depended_on_by.length > 0;

  return (
    <li
      style={{
        padding: "var(--space-3)",
        borderBottom: "1px solid var(--border-hairline)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <Icon name={candidate.resource_kind} size={16} />
        <span className="text-body" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {candidate.name}
        </span>
        <span className="text-data-sm" style={{ color: "var(--text-tertiary)" }}>
          {formatBytes(candidate.size_bytes)}
        </span>
        <span
          className="text-caption"
          style={{
            padding: "1px 6px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-hairline)",
            color: candidate.reversible ? "var(--status-healthy)" : "var(--status-warning)",
          }}
        >
          {candidate.reversible ? "reversible" : "not reversible"}
        </span>
      </div>

      {candidate.path && (
        <div className="text-data-sm" style={{ color: "var(--text-tertiary)", overflowWrap: "anywhere" }}>
          {candidate.path}
        </div>
      )}

      <p className="text-body-sm" style={{ margin: 0, color: "var(--text-secondary)" }}>
        {candidate.reasoning}
      </p>

      <p className="text-body-sm" style={{ margin: 0, color: "var(--text-tertiary)" }}>
        {candidate.last_used ? `Last used ${formatRelativeTime(candidate.last_used)}. ` : ""}
        {candidate.consequence}
      </p>

      {hasDependents && (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(217, 164, 65, 0.1)",
            border: "1px solid var(--status-warning)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <Icon name="warning" size={16} />
            <span className="text-label" style={{ color: "var(--status-warning)" }}>
              {candidate.depended_on_by.length} resource{candidate.depended_on_by.length === 1 ? "" : "s"} depend on this
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {candidate.depended_on_by.map((id) => {
              const dependent = graph?.resources[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectDependent(id)}
                  className="text-data-sm"
                  style={{ color: "var(--text-primary)", textDecoration: "underline" }}
                >
                  {dependent?.name ?? id}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        {candidate.path && (
          <button
            type="button"
            onClick={() => revealPath(candidate.path!)}
            className="text-label"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "var(--space-1) var(--space-2)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
          >
            <Icon name="external-link" size={16} />
            Open in Finder / Explorer
          </button>
        )}
        {candidate.path && (
          <button
            type="button"
            onClick={() => copyPath(candidate.path!)}
            className="text-label"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "var(--space-1) var(--space-2)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
          >
            <Icon name="copy" size={16} />
            Copy path
          </button>
        )}
      </div>
    </li>
  );
}
