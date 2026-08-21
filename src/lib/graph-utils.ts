import type { Graph, Relationship, Resource } from "./types";

export interface NeighborEdge {
  relationship: Relationship;
  otherId: string;
  direction: "outgoing" | "incoming";
}

// Client-side equivalent of the backend's neighborhood() helper: filter the
// already-fetched graph's relationships for edges touching one resource, in
// both directions. There is no separate "get project detail" IPC command,
// so this runs against the cached Graph from getGraph().
export function neighborhood(graph: Graph, resourceId: string): NeighborEdge[] {
  const edges: NeighborEdge[] = [];
  for (const rel of graph.relationships) {
    if (rel.from === resourceId) {
      edges.push({ relationship: rel, otherId: rel.to, direction: "outgoing" });
    } else if (rel.to === resourceId) {
      edges.push({ relationship: rel, otherId: rel.from, direction: "incoming" });
    }
  }
  return edges;
}

export function neighborResources(graph: Graph, resourceId: string): { resource: Resource; edge: NeighborEdge }[] {
  return neighborhood(graph, resourceId)
    .map((edge) => {
      const resource = graph.resources[edge.otherId];
      return resource ? { resource, edge } : null;
    })
    .filter((v): v is { resource: Resource; edge: NeighborEdge } => v !== null);
}

export function resourcesByKind(graph: Graph): Map<string, Resource[]> {
  const map = new Map<string, Resource[]>();
  for (const resource of Object.values(graph.resources)) {
    const list = map.get(resource.kind) ?? [];
    list.push(resource);
    map.set(resource.kind, list);
  }
  return map;
}

// Nodes with the most relationships touching them — used to size graph
// nodes by degree (DESIGN.md 5.2) and to find "hub" resources.
export function degreeOf(graph: Graph, resourceId: string): number {
  let n = 0;
  for (const rel of graph.relationships) {
    if (rel.from === resourceId || rel.to === resourceId) n++;
  }
  return n;
}
