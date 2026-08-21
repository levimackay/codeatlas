// Mirrors the serde output of the types in crates/core/src. Kept as a
// hand-written mirror rather than generated bindings for the initial
// release; ROADMAP.md tracks moving this to ts-rs generated types once
// the schema stabilizes.

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
  attributes: Record<string, unknown>;
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
  evidence: Evidence[];
}

export interface Graph {
  resources: Record<string, Resource>;
  relationships: Relationship[];
}

export type ScanStatus = "running" | "completed" | "failed";

export interface ProviderRunSummary {
  provider_id: string;
  available: boolean;
  unavailable_reason: string | null;
  resources_found: number;
  duration_ms: number;
  error: string | null;
}

export interface ScanRecord {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: ScanStatus;
  resources_found: number;
  providers_run: ProviderRunSummary[];
}

export type ChangeKind = "discovered" | "removed" | "modified";

export interface ChangeEvent {
  id: string;
  resource_id: string;
  resource_kind: ResourceKind;
  resource_name: string;
  kind: ChangeKind;
  summary: string;
  occurred_at: string;
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
  evidence: Evidence[];
  last_used: string | null;
  depended_on_by: string[];
  size_bytes: number | null;
  reversible: boolean;
  consequence: string;
}

export type OperatingSystem = "macos" | "linux" | "windows";

export interface SystemInfo {
  os: OperatingSystem;
  os_version: string;
  architecture: string;
  hostname: string;
  home_directory: string;
  cpu_cores: number;
  total_memory_bytes: number;
}

export interface PlatformCapabilities {
  processes: boolean;
  ports: boolean;
  services: boolean;
  disk_usage: boolean;
  application_inventory: boolean;
}

export interface ScanSummary {
  record: ScanRecord;
  changes: ChangeEvent[];
}
