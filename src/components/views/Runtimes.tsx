import { useMemo, useState } from "react";
import { useGraphQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Table, type Column } from "../ui/Table";
import { StatusDot } from "../ui/StatusDot";
import { EmptyState } from "../ui/EmptyState";
import { attr, asString } from "../../lib/resource-attrs";
import type { Resource, ResourceKind } from "../../lib/types";

// Note: `ResourceKind.package` and `ResourceKind.tool` exist in the type
// system (crates/core/src/resource.rs) but no discovery provider in this
// release produces either — package_managers.rs only ever emits
// `package_manager` resources (the manager binary itself, e.g. npm/pip),
// never the individual packages a project depends on, and nothing emits
// `tool`. Those two tabs are left out rather than shown as permanent dead
// ends; see this file's note in the implementation report.
type Tab = "runtime" | "package_manager";

const TABS: { id: Tab; label: string }[] = [
  { id: "runtime", label: "Runtimes" },
  { id: "package_manager", label: "Package managers" },
];

export function Runtimes() {
  const { data: graph, isLoading } = useGraphQuery();
  const { selectedResourceId, selectResource } = useNavigation();
  const [tab, setTab] = useState<Tab>("runtime");

  const rows = useMemo(() => {
    if (!graph) return [];
    return Object.values(graph.resources).filter((r) => r.kind === (tab as ResourceKind));
  }, [graph, tab]);

  const columns: Column<Resource>[] = [
    { id: "name", header: "Name", width: "34%", sortValue: (r) => r.name, render: (r) => r.name },
    { id: "version", header: "Version", width: "20%", mono: true, render: (r) => asString(attr(r, "version")) || "—" },
    { id: "path", header: "Path", width: "46%", mono: true, render: (r) => r.path ?? asString(attr(r, "path")) ?? "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--space-4) var(--space-6) var(--space-2)" }}>
        <h1 className="text-display" style={{ margin: 0 }}>
          Runtimes &amp; Package Managers
        </h1>
        <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-3)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="text-label-lg"
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderBottom: tab === t.id ? "2px solid var(--accent-copper)" : "2px solid transparent",
                color: tab === t.id ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 var(--space-6) var(--space-6)" }}>
        {isLoading ? (
          <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing here" description="Run a scan to populate this view." />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selectedId={selectedResourceId}
            onRowClick={(r) => selectResource(r.id)}
            leading={() => <StatusDot status="healthy" />}
          />
        )}
      </div>
    </div>
  );
}
