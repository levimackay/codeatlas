import { useMemo, useState } from "react";
import { useGraphQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Table, type Column } from "../ui/Table";
import { StatusDot } from "../ui/StatusDot";
import { EmptyState } from "../ui/EmptyState";
import { attr, asString } from "../../lib/resource-attrs";
import { neighborResources } from "../../lib/graph-utils";
import type { Graph, Resource } from "../../lib/types";

type Tab = "processes" | "ports";

// Note: `ResourceKind.network_listener` exists in the type system
// (crates/core/src/resource.rs) but no discovery provider in this release
// actually produces it — the process/port provider only ever emits
// `process` and `port` resources, linked by a `listens_on` relationship
// (crates/discovery/src/providers/process_ports.rs). A "Listeners" tab
// here would always be empty, so it's left out rather than shown as a
// dead end; see this file's note in the implementation report.
function findOwningProcess(graph: Graph | undefined, portId: string): Resource | null {
  if (!graph) return null;
  const owner = neighborResources(graph, portId).find((n) => n.resource.kind === "process");
  return owner?.resource ?? null;
}

export function ProcessesPorts() {
  const { data: graph, isLoading } = useGraphQuery();
  const { selectedResourceId, selectResource } = useNavigation();
  const [tab, setTab] = useState<Tab>("processes");

  const rows = useMemo(() => {
    if (!graph) return [];
    const kind = tab === "processes" ? "process" : "port";
    return Object.values(graph.resources).filter((r) => r.kind === kind);
  }, [graph, tab]);

  const columns: Column<Resource>[] =
    tab === "processes"
      ? [
          { id: "name", header: "Process", width: "26%", sortValue: (r) => r.name, render: (r) => r.name },
          { id: "pid", header: "PID", width: "12%", mono: true, sortValue: (r) => Number(attr(r, "pid")) || 0, render: (r) => asString(attr(r, "pid")) || "—" },
          { id: "command", header: "Command", width: "38%", mono: true, render: (r) => asString(attr(r, "command_preview")) || "—" },
          { id: "parent_pid", header: "Parent PID", width: "12%", mono: true, render: (r) => asString(attr(r, "parent_pid")) || "—" },
          { id: "cwd", header: "Working dir", width: "12%", mono: true, render: (r) => r.path ?? "—" },
        ]
      : [
          { id: "port", header: "Port", width: "14%", mono: true, sortValue: (r) => Number(attr(r, "port")) || 0, render: (r) => asString(attr(r, "port")) || r.name },
          { id: "protocol", header: "Protocol", width: "14%", render: (r) => asString(attr(r, "protocol")) || "—" },
          { id: "address", header: "Local address", width: "24%", mono: true, render: (r) => asString(attr(r, "local_address")) || "—" },
          {
            id: "process",
            header: "Owning process",
            width: "34%",
            render: (r) => {
              const owner = findOwningProcess(graph, r.id);
              return owner ? owner.name : asString(attr(r, "owning_pid")) ? `pid ${asString(attr(r, "owning_pid"))}` : "—";
            },
          },
          { id: "pid", header: "PID", width: "14%", mono: true, render: (r) => asString(attr(r, "owning_pid")) || "—" },
        ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--space-4) var(--space-6) var(--space-2)" }}>
        <h1 className="text-display" style={{ margin: 0 }}>
          Processes &amp; Ports
        </h1>
        <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-3)" }}>
          {([
            ["processes", "Processes"],
            ["ports", "Ports"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="text-label-lg"
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderBottom: tab === id ? "2px solid var(--accent-copper)" : "2px solid transparent",
                color: tab === id ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {label}
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
          <EmptyState title={`No ${tab} discovered`} description="Run a scan to populate this view." />
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
