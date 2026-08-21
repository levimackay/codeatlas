// Mirrors the real, shipped shape of crates/core/src/resource.rs as exposed
// through src/lib/types.ts in the CodeAtlas desktop app. Kept identical so
// the site's demos are typed against the same shape the product itself
// uses, not a marketing-site simplification of it.

export type ResourceKind =
  | "project"
  | "git_repository"
  | "process"
  | "port"
  | "docker_container"
  | "docker_image"
  | "docker_volume"
  | "docker_network"
  | "database"
  | "runtime"
  | "package_manager"
  | "package"
  | "tool"
  | "environment_variable"
  | "ssh_config_entry"
  | "build_artifact"
  | "cache"
  | "service"
  | "config_file"
  | "disk_usage_entry"
  | "network_listener";

export interface Evidence {
  source: string;
  description: string;
  path: string | null;
}

export interface Resource {
  id: string;
  kind: ResourceKind;
  name: string;
  path: string | null;
  attributes: Record<string, string>;
  evidence: Evidence[];
  first_seen: string;
  last_seen: string;
}

export type RelationshipKind =
  | "contains"
  | "runs_as"
  | "listens_on"
  | "depends_on"
  | "produces"
  | "instantiated_from"
  | "mounts"
  | "attached_to"
  | "connects_to"
  | "uses";

export interface Relationship {
  from: string;
  to: string;
  kind: RelationshipKind;
}

export type CleanupCategory =
  | "unused_docker_image"
  | "unused_docker_volume"
  | "stale_build_artifact"
  | "cache"
  | "unused_package_manager_artifact"
  | "stale_environment"
  | "large_dependency_tree"
  | "old_generated_file";

export interface CleanupCandidate {
  resource_id: string;
  resource_kind: ResourceKind;
  name: string;
  path: string | null;
  category: CleanupCategory;
  reasoning: string;
  last_used: string | null;
  depended_on_by: string[];
  size_bytes: number | null;
  reversible: boolean;
  consequence: string;
}

export type ChangeKind = "discovered" | "removed" | "modified";

export interface ChangeEvent {
  id: string;
  resource_name: string;
  resource_kind: ResourceKind;
  kind: ChangeKind;
  summary: string;
  occurred_at: string;
}
