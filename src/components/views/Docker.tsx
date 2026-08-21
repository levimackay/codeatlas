import { useMemo, useState } from "react";
import { useGraphQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Table, type Column } from "../ui/Table";
import { StatusDot } from "../ui/StatusDot";
import { EmptyState } from "../ui/EmptyState";
import { attr, asString } from "../../lib/resource-attrs";
import type { Resource, ResourceKind } from "../../lib/types";

type Tab = "docker_container" | "docker_image" | "docker_volume" | "docker_network";

const TABS: { id: Tab; label: string }[] = [
  { id: "docker_container", label: "Containers" },
  { id: "docker_image", label: "Images" },
  { id: "docker_volume", label: "Volumes" },
  { id: "docker_network", label: "Networks" },
];

function columnsFor(tab: Tab): Column<Resource>[] {
  switch (tab) {
    case "docker_container":
      return [
        { id: "name", header: "Container", width: "28%", sortValue: (r) => r.name, render: (r) => r.name },
        { id: "image", header: "Image", width: "28%", mono: true, render: (r) => asString(attr(r, "image")) || "—" },
        { id: "status", header: "Status", width: "22%", render: (r) => asString(attr(r, "status")) || "—" },
        { id: "ports", header: "Ports", width: "22%", mono: true, render: (r) => asString(attr(r, "ports")) || "—" },
      ];
    case "docker_image":
      return [
        { id: "name", header: "Image", width: "30%", sortValue: (r) => r.name, render: (r) => r.name },
        { id: "repository", header: "Repository", width: "26%", mono: true, render: (r) => asString(attr(r, "repository")) || "—" },
        { id: "tag", header: "Tag", width: "18%", mono: true, render: (r) => asString(attr(r, "tag")) || "—" },
        { id: "size", header: "Size", width: "13%", mono: true, render: (r) => asString(attr(r, "size")) || "—" },
        { id: "created_at", header: "Created", width: "13%", mono: true, render: (r) => asString(attr(r, "created_at")) || "—" },
      ];
    case "docker_volume":
      return [
        { id: "name", header: "Volume", width: "40%", sortValue: (r) => r.name, render: (r) => r.name },
        { id: "driver", header: "Driver", width: "20%", render: (r) => asString(attr(r, "driver")) || "—" },
        { id: "mountpoint", header: "Mountpoint", width: "40%", mono: true, render: (r) => asString(attr(r, "mountpoint")) || r.path || "—" },
      ];
    case "docker_network":
      return [
        { id: "name", header: "Network", width: "50%", sortValue: (r) => r.name, render: (r) => r.name },
        { id: "driver", header: "Driver", width: "25%", render: (r) => asString(attr(r, "driver")) || "—" },
        { id: "scope", header: "Scope", width: "25%", render: (r) => asString(attr(r, "scope")) || "—" },
      ];
  }
}

export function Docker() {
  const { data: graph, isLoading } = useGraphQuery();
  const { selectedResourceId, selectResource } = useNavigation();
  const [tab, setTab] = useState<Tab>("docker_container");

  const rows = useMemo(() => {
    if (!graph) return [];
    return Object.values(graph.resources).filter((r) => r.kind === (tab as ResourceKind));
  }, [graph, tab]);

  const dockerUnavailable = graph && Object.values(graph.resources).every((r) => !r.kind.startsWith("docker_"));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--space-4) var(--space-6) var(--space-2)" }}>
        <h1 className="text-display" style={{ margin: 0 }}>
          Docker
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
          <EmptyState
            title={dockerUnavailable ? "Docker not available" : "Nothing here"}
            description={
              dockerUnavailable
                ? "Docker isn't installed or isn't running. Check Settings → Diagnostics for the provider's exact reason."
                : "Run a scan to populate this view."
            }
          />
        ) : (
          <Table
            columns={columnsFor(tab)}
            rows={rows}
            getRowId={(r) => r.id}
            selectedId={selectedResourceId}
            onRowClick={(r) => selectResource(r.id)}
            leading={(r) => <StatusDot status={asString(attr(r, "status")).toLowerCase().includes("running") ? "healthy" : "info"} />}
          />
        )}
      </div>
    </div>
  );
}
