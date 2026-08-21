import { useEffect, useMemo } from "react";
import { useGraphQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { Table, type Column } from "../ui/Table";
import { Icon } from "../icons/Icon";
import { StatusDot } from "../ui/StatusDot";
import { EmptyState } from "../ui/EmptyState";
import { attr, asString } from "../../lib/resource-attrs";
import { neighborResources } from "../../lib/graph-utils";
import type { Resource } from "../../lib/types";

interface ProjectRow {
  resource: Resource;
  gitRepo: Resource | null;
}

// Project explorer — DESIGN.md 4.4 dense table, never cards. The project
// resource itself only carries `ecosystems` and `has_git`
// (crates/discovery/src/providers/filesystem_project.rs) — branch/clean
// state lives on the related `git_repository` resource, linked by a
// Contains relationship (crates/discovery/src/providers/git.rs), so each
// row resolves that neighbor from the graph rather than reading a
// `branch`/`clean` attribute that was never set on the project itself.
// Selecting a row opens the shared DetailPane, which already renders the
// full Resource record plus every relationship touching it — Projects
// doesn't need its own copy of that logic.
export function Projects() {
  const { data: graph, isLoading } = useGraphQuery();
  const { selectedResourceId, selectResource, params } = useNavigation();

  const rows = useMemo<ProjectRow[]>(() => {
    if (!graph) return [];
    return Object.values(graph.resources)
      .filter((r) => r.kind === "project")
      .map((resource) => {
        const gitRepo = neighborResources(graph, resource.id).find((n) => n.resource.kind === "git_repository");
        return { resource, gitRepo: gitRepo?.resource ?? null };
      });
  }, [graph]);

  useEffect(() => {
    if (params.projectId) selectResource(params.projectId);
    // Only re-run when the incoming param actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.projectId]);

  const columns: Column<ProjectRow>[] = [
    {
      id: "name",
      header: "Project",
      width: "26%",
      sortValue: (r) => r.resource.name,
      render: ({ resource }) => (
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <Icon name="project" size={16} />
          <span className="text-body">{resource.name}</span>
        </span>
      ),
    },
    {
      id: "ecosystems",
      header: "Ecosystems",
      width: "18%",
      render: ({ resource }) => asString(attr(resource, "ecosystems")) || "—",
    },
    {
      id: "branch",
      header: "Branch",
      width: "16%",
      mono: true,
      render: ({ gitRepo }) => (gitRepo ? asString(attr(gitRepo, "current_branch") ?? attr(gitRepo, "branch")) || "—" : "—"),
    },
    {
      id: "clean",
      header: "Git status",
      width: "12%",
      render: ({ resource, gitRepo }) => {
        if (!attr(resource, "has_git") || !gitRepo) return <span style={{ color: "var(--text-disabled)" }}>no git</span>;
        const clean = attr(gitRepo, "clean");
        if (clean === true) return <span style={{ color: "var(--status-healthy)" }}>clean</span>;
        if (clean === false) return <span style={{ color: "var(--status-warning)" }}>dirty</span>;
        return "—";
      },
    },
    {
      id: "path",
      header: "Path",
      width: "28%",
      mono: true,
      render: ({ resource }) => resource.path ?? "—",
    },
  ];

  if (isLoading) {
    return (
      <div className="text-body-sm" style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>
        Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <EmptyState title="No projects discovered" description="Add a search root in Settings and run a scan to find projects." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--space-4) var(--space-6) var(--space-2)" }}>
        <h1 className="text-display" style={{ margin: 0 }}>
          Projects
        </h1>
        <p className="text-body-sm" style={{ margin: "var(--space-1) 0 0", color: "var(--text-tertiary)" }}>
          {rows.length} project{rows.length === 1 ? "" : "s"}
        </p>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 var(--space-6) var(--space-6)" }}>
        <Table
          columns={columns}
          rows={rows}
          getRowId={(r) => r.resource.id}
          selectedId={selectedResourceId}
          onRowClick={(r) => selectResource(r.resource.id)}
          leading={({ gitRepo }) => <StatusDot status={gitRepo && attr(gitRepo, "clean") === false ? "warning" : "healthy"} />}
        />
      </div>
    </div>
  );
}
