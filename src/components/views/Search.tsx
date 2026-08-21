import { useMemo, useState } from "react";
import { useSearchResourcesQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Table, type Column } from "../ui/Table";
import { Icon } from "../icons/Icon";
import { kindLabel } from "../../lib/kind-colors";
import { EmptyState } from "../ui/EmptyState";
import type { Resource, ResourceKind } from "../../lib/types";

// A real search view backed by searchResources(query), independent of the
// command palette — grouped/filterable by kind per the brief.
export function SearchView() {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ResourceKind | "all">("all");
  const { data: results, isLoading } = useSearchResourcesQuery(query, 100);
  const { selectedResourceId, selectResource } = useNavigation();

  const kinds = useMemo(() => {
    const set = new Set<ResourceKind>();
    for (const r of results ?? []) set.add(r.kind);
    return [...set].sort();
  }, [results]);

  const filtered = useMemo(() => {
    if (kindFilter === "all") return results ?? [];
    return (results ?? []).filter((r) => r.kind === kindFilter);
  }, [results, kindFilter]);

  const columns: Column<Resource>[] = [
    { id: "name", header: "Name", width: "30%", sortValue: (r) => r.name, render: (r) => r.name },
    { id: "kind", header: "Kind", width: "20%", render: (r) => kindLabel(r.kind) },
    { id: "path", header: "Path", width: "50%", mono: true, render: (r) => r.path ?? "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--space-4) var(--space-6) var(--space-3)" }}>
        <h1 className="text-display" style={{ margin: 0 }}>
          Search
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <Icon name="search" size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources by name…"
            aria-label="Search resources"
            className="text-body"
            style={{
              flex: 1,
              maxWidth: 480,
              padding: "var(--space-2) var(--space-3)",
              background: "var(--surface-panel)",
              border: "1px solid var(--border-hairline-strong)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        {kinds.length > 1 && (
          <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
            <FilterChip label="All" active={kindFilter === "all"} onClick={() => setKindFilter("all")} />
            {kinds.map((k) => (
              <FilterChip key={k} label={kindLabel(k)} active={kindFilter === k} onClick={() => setKindFilter(k)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 var(--space-6) var(--space-6)" }}>
        {!query.trim() ? (
          <EmptyState title="Search your machine" description="Type a project, process, port, or path name above." />
        ) : isLoading ? (
          <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            Searching…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No matches" description={`Nothing matched "${query}".`} />
        ) : (
          <Table columns={columns} rows={filtered} getRowId={(r) => r.id} selectedId={selectedResourceId} onRowClick={(r) => selectResource(r.id)} />
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-caption"
      style={{
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        border: `1px solid ${active ? "var(--accent-copper)" : "var(--border-hairline-strong)"}`,
        color: active ? "var(--accent-copper)" : "var(--text-tertiary)",
        background: active ? "var(--accent-copper-wash)" : "transparent",
      }}
    >
      {label}
    </button>
  );
}
