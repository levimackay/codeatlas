// SAMPLE FIXTURE — entirely fabricated.
//
// Every resource, path, port, size, and timestamp below was authored by
// hand for this website. None of it comes from a real scan, and it is
// never read from or written back to the desktop app's own gitignored
// scan exports (src/demo/fixture.json). It exists so the site's demos —
// the dependency graph, the project detail pane, and the cleanup center —
// can run the product's real rendering logic against *some* data, without
// ever implying that data describes a real machine, this developer's
// machine, or any visitor's machine.
//
// Every place this fixture reaches the page is labeled "sample data" in
// the surrounding markup. If you are extending this file, keep it that
// way — see DESIGN.md's Materials table and the Local SEO note in
// SOURCES.md for the reasoning.

import type { CleanupCandidate, ChangeEvent, Relationship, Resource, ResourceKind } from "../lib/types";

export const resources: Resource[] = [
  // --- projects -----------------------------------------------------
  {
    id: "project:api-gateway",
    kind: "project",
    name: "api-gateway",
    path: "~/Developer/api-gateway",
    attributes: { language: "TypeScript", framework: "Express", branch: "main" },
    evidence: [
      { source: "projects", description: "package.json found at project root", path: "~/Developer/api-gateway/package.json" },
      { source: "git", description: ".git directory found, 3 local branches", path: "~/Developer/api-gateway/.git" },
    ],
    first_seen: "2026-03-02T14:10:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "project:billing-service",
    kind: "project",
    name: "billing-service",
    path: "~/Developer/billing-service",
    attributes: { language: "Rust", framework: "axum", branch: "main" },
    evidence: [
      { source: "projects", description: "Cargo.toml found at project root", path: "~/Developer/billing-service/Cargo.toml" },
      { source: "git", description: ".git directory found, 1 local branch", path: "~/Developer/billing-service/.git" },
    ],
    first_seen: "2026-01-18T08:40:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "project:worker-queue",
    kind: "project",
    name: "worker-queue",
    path: "~/Developer/worker-queue",
    attributes: { language: "Python", framework: "celery", branch: "main" },
    evidence: [
      { source: "projects", description: "pyproject.toml found at project root", path: "~/Developer/worker-queue/pyproject.toml" },
      { source: "git", description: ".git directory found, 2 local branches", path: "~/Developer/worker-queue/.git" },
    ],
    first_seen: "2026-05-27T11:02:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- git repositories ----------------------------------------------
  {
    id: "repo:api-gateway",
    kind: "git_repository",
    name: "api-gateway",
    path: "~/Developer/api-gateway/.git",
    attributes: { branch: "main", remote: "github.com/sample-org/api-gateway", last_commit: "a3f9c02" },
    evidence: [{ source: "git", description: "git log -1 --format=%H", path: null }],
    first_seen: "2026-03-02T14:10:00Z",
    last_seen: "2026-08-20T17:44:00Z",
  },
  {
    id: "repo:billing-service",
    kind: "git_repository",
    name: "billing-service",
    path: "~/Developer/billing-service/.git",
    attributes: { branch: "main", remote: "github.com/sample-org/billing-service", last_commit: "e112ab7" },
    evidence: [{ source: "git", description: "git log -1 --format=%H", path: null }],
    first_seen: "2026-01-18T08:40:00Z",
    last_seen: "2026-08-19T10:02:00Z",
  },
  {
    id: "repo:worker-queue",
    kind: "git_repository",
    name: "worker-queue",
    path: "~/Developer/worker-queue/.git",
    attributes: { branch: "main", remote: "github.com/sample-org/worker-queue", last_commit: "9d40f11" },
    evidence: [{ source: "git", description: "git log -1 --format=%H", path: null }],
    first_seen: "2026-05-27T11:02:00Z",
    last_seen: "2026-08-21T09:00:00Z",
  },

  // --- processes -------------------------------------------------------
  {
    id: "process:node-api-gateway",
    kind: "process",
    name: "node",
    path: "~/Developer/api-gateway/dist/index.js",
    attributes: { pid: "41213", user: "sample", cmd: "node dist/index.js" },
    evidence: [{ source: "processes", description: "process table entry", path: null }],
    first_seen: "2026-08-21T08:02:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "process:cargo-billing",
    kind: "process",
    name: "billing-service",
    path: "~/Developer/billing-service/target/debug/billing-service",
    attributes: { pid: "41890", user: "sample", cmd: "target/debug/billing-service" },
    evidence: [{ source: "processes", description: "process table entry", path: null }],
    first_seen: "2026-08-21T08:03:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- ports -------------------------------------------------------------
  {
    id: "port:3000",
    kind: "port",
    name: ":3000",
    path: null,
    attributes: { protocol: "tcp", bind: "127.0.0.1" },
    evidence: [{ source: "processes", description: "listening socket table", path: null }],
    first_seen: "2026-08-21T08:02:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "port:8080",
    kind: "port",
    name: ":8080",
    path: null,
    attributes: { protocol: "tcp", bind: "127.0.0.1" },
    evidence: [{ source: "processes", description: "listening socket table", path: null }],
    first_seen: "2026-08-21T08:03:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "port:5432",
    kind: "port",
    name: ":5432",
    path: null,
    attributes: { protocol: "tcp", bind: "0.0.0.0" },
    evidence: [
      { source: "docker", description: "container port mapping", path: null },
      { source: "services", description: "launchd service also bound to this port", path: null },
    ],
    first_seen: "2026-02-01T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- docker ------------------------------------------------------------
  {
    id: "docker:postgres-dev",
    kind: "docker_container",
    name: "postgres-dev",
    path: null,
    attributes: { status: "running", image: "postgres:16", ports: "5432:5432" },
    evidence: [{ source: "docker", description: "docker container ls", path: null }],
    first_seen: "2026-02-01T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "docker:redis-cache",
    kind: "docker_container",
    name: "redis-cache",
    path: null,
    attributes: { status: "exited", image: "redis:7-alpine", ports: "" },
    evidence: [{ source: "docker", description: "docker container ls -a", path: null }],
    first_seen: "2026-02-14T13:20:00Z",
    last_seen: "2026-06-30T09:00:00Z",
  },
  {
    id: "docker-image:postgres16",
    kind: "docker_image",
    name: "postgres:16",
    path: null,
    attributes: { size: "438 MB", digest: "sha256:9c1f…7be2" },
    evidence: [{ source: "docker", description: "docker image ls", path: null }],
    first_seen: "2026-02-01T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "docker-image:redis7",
    kind: "docker_image",
    name: "redis:7-alpine",
    path: null,
    attributes: { size: "41 MB", digest: "sha256:2a88…0c14" },
    evidence: [{ source: "docker", description: "docker image ls", path: null }],
    first_seen: "2026-02-14T13:20:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "docker-image:node18-stale",
    kind: "docker_image",
    name: "node:18-alpine",
    path: null,
    attributes: { size: "178 MB", digest: "sha256:4f0e…aa31" },
    evidence: [{ source: "docker", description: "docker image ls, no container references this image", path: null }],
    first_seen: "2026-01-05T10:00:00Z",
    last_seen: "2026-01-05T10:00:00Z",
  },
  {
    id: "docker-volume:pgdata",
    kind: "docker_volume",
    name: "pgdata",
    path: null,
    attributes: { driver: "local", size: "612 MB" },
    evidence: [{ source: "docker", description: "docker volume ls", path: null }],
    first_seen: "2026-02-01T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "docker-volume:old-pgdata-backup",
    kind: "docker_volume",
    name: "old_pgdata_backup",
    path: null,
    attributes: { driver: "local", size: "640 MB" },
    evidence: [{ source: "docker", description: "docker volume ls, not mounted by any container", path: null }],
    first_seen: "2026-01-10T09:00:00Z",
    last_seen: "2026-01-10T09:00:00Z",
  },
  {
    id: "docker-network:devnet",
    kind: "docker_network",
    name: "devnet",
    path: null,
    attributes: { driver: "bridge" },
    evidence: [{ source: "docker", description: "docker network ls", path: null }],
    first_seen: "2026-02-01T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- database ------------------------------------------------------------
  {
    id: "database:billing",
    kind: "database",
    name: "billing",
    path: null,
    attributes: { engine: "postgres", version: "16" },
    evidence: [{ source: "docker", description: "database name observed in container environment declaration", path: null }],
    first_seen: "2026-02-01T09:05:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- runtimes ------------------------------------------------------------
  {
    id: "runtime:node",
    kind: "runtime",
    name: "Node",
    path: "/usr/local/bin/node",
    attributes: { version: "20.11.1" },
    evidence: [{ source: "runtimes", description: "node --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "runtime:rust",
    kind: "runtime",
    name: "Rust",
    path: "~/.cargo/bin/rustc",
    attributes: { version: "1.78.0" },
    evidence: [{ source: "runtimes", description: "rustc --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "runtime:python",
    kind: "runtime",
    name: "Python",
    path: "/usr/local/bin/python3",
    attributes: { version: "3.11.7" },
    evidence: [{ source: "runtimes", description: "python3 --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- package managers ------------------------------------------------------------
  {
    id: "pm:pnpm",
    kind: "package_manager",
    name: "pnpm",
    path: "/usr/local/bin/pnpm",
    attributes: { version: "9.1.0" },
    evidence: [{ source: "package_managers", description: "pnpm --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "pm:cargo",
    kind: "package_manager",
    name: "cargo",
    path: "~/.cargo/bin/cargo",
    attributes: { version: "1.78.0" },
    evidence: [{ source: "package_managers", description: "cargo --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "pm:pip",
    kind: "package_manager",
    name: "pip",
    path: "/usr/local/bin/pip3",
    attributes: { version: "24.0" },
    evidence: [{ source: "package_managers", description: "pip3 --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- packages ------------------------------------------------------------
  {
    id: "package:express",
    kind: "package",
    name: "express",
    path: "~/Developer/api-gateway/node_modules/express",
    attributes: { version: "4.19.2" },
    evidence: [{ source: "package_managers", description: "package.json dependency", path: null }],
    first_seen: "2026-03-02T14:10:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "package:tokio",
    kind: "package",
    name: "tokio",
    path: "~/Developer/billing-service/target/debug/deps",
    attributes: { version: "1.37.0" },
    evidence: [{ source: "package_managers", description: "Cargo.lock dependency", path: null }],
    first_seen: "2026-01-18T08:40:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- tool ------------------------------------------------------------
  {
    id: "tool:docker",
    kind: "tool",
    name: "docker",
    path: "/usr/local/bin/docker",
    attributes: { version: "26.0.0" },
    evidence: [{ source: "tools", description: "docker --version", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- environment variables (names only, never values) -------------------
  {
    id: "env:database-url",
    kind: "environment_variable",
    name: "DATABASE_URL",
    path: null,
    attributes: { seen_in: "api-gateway process environment" },
    evidence: [{ source: "environment", description: "variable name observed, value never read", path: null }],
    first_seen: "2026-03-02T14:10:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
  {
    id: "env:stripe-api-key",
    kind: "environment_variable",
    name: "STRIPE_API_KEY",
    path: null,
    attributes: { seen_in: "billing-service process environment" },
    evidence: [{ source: "environment", description: "variable name observed, value never read", path: null }],
    first_seen: "2026-01-18T08:40:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- ssh config ------------------------------------------------------------
  {
    id: "ssh:deploy-staging",
    kind: "ssh_config_entry",
    name: "deploy-staging",
    path: "~/.ssh/config",
    attributes: { hostname: "staging.sample-org.internal", user: "deploy", port: "22" },
    evidence: [{ source: "ssh", description: "Host block in ~/.ssh/config", path: "~/.ssh/config" }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- build artifact ------------------------------------------------------------
  {
    id: "artifact:billing-target",
    kind: "build_artifact",
    name: "target/",
    path: "~/Developer/billing-service/target",
    attributes: { size: "1.4 GB", profile: "debug" },
    evidence: [{ source: "disk_usage", description: "directory walk under project root", path: "~/Developer/billing-service/target" }],
    first_seen: "2026-01-18T09:00:00Z",
    last_seen: "2026-07-02T16:20:00Z",
  },

  // --- cache ------------------------------------------------------------
  {
    id: "cache:pnpm-store",
    kind: "cache",
    name: "pnpm store",
    path: "~/Library/pnpm/store",
    attributes: { size: "2.1 GB" },
    evidence: [{ source: "disk_usage", description: "known package-manager cache directory", path: "~/Library/pnpm/store" }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-07-15T12:00:00Z",
  },

  // --- service ------------------------------------------------------------
  {
    id: "service:postgresql16",
    kind: "service",
    name: "postgresql@16",
    path: null,
    attributes: { manager: "launchd", state: "loaded" },
    evidence: [{ source: "services", description: "launchctl list", path: null }],
    first_seen: "2026-01-02T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- config file ------------------------------------------------------------
  {
    id: "config:worker-config",
    kind: "config_file",
    name: "config.toml",
    path: "~/Developer/worker-queue/config.toml",
    attributes: { format: "toml" },
    evidence: [{ source: "projects", description: "recognized config filename in project root", path: "~/Developer/worker-queue/config.toml" }],
    first_seen: "2026-05-27T11:02:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },

  // --- disk usage ------------------------------------------------------------
  {
    id: "disk:node-modules",
    kind: "disk_usage_entry",
    name: "node_modules/",
    path: "~/Developer/api-gateway/node_modules",
    attributes: { size: "850 MB", file_count: "31,402" },
    evidence: [{ source: "disk_usage", description: "directory walk under project root", path: "~/Developer/api-gateway/node_modules" }],
    first_seen: "2026-03-02T14:12:00Z",
    last_seen: "2026-08-10T09:00:00Z",
  },

  // --- network listener ------------------------------------------------------------
  {
    id: "listener:postgres-5432",
    kind: "network_listener",
    name: "0.0.0.0:5432",
    path: null,
    attributes: { owner: "postgres-dev" },
    evidence: [{ source: "processes", description: "listening socket table, cross-referenced against docker port mapping", path: null }],
    first_seen: "2026-02-01T09:00:00Z",
    last_seen: "2026-08-21T09:14:00Z",
  },
];

export const relationships: Relationship[] = [
  { from: "project:api-gateway", to: "repo:api-gateway", kind: "contains" },
  { from: "project:api-gateway", to: "runtime:node", kind: "uses" },
  { from: "project:api-gateway", to: "pm:pnpm", kind: "uses" },
  { from: "project:api-gateway", to: "package:express", kind: "depends_on" },
  { from: "project:api-gateway", to: "tool:docker", kind: "uses" },
  { from: "project:api-gateway", to: "env:database-url", kind: "uses" },
  { from: "process:node-api-gateway", to: "project:api-gateway", kind: "runs_as" },
  { from: "process:node-api-gateway", to: "port:3000", kind: "listens_on" },
  { from: "pm:pnpm", to: "disk:node-modules", kind: "produces" },
  { from: "pm:pnpm", to: "cache:pnpm-store", kind: "produces" },

  { from: "project:billing-service", to: "repo:billing-service", kind: "contains" },
  { from: "project:billing-service", to: "runtime:rust", kind: "uses" },
  { from: "project:billing-service", to: "pm:cargo", kind: "uses" },
  { from: "project:billing-service", to: "package:tokio", kind: "depends_on" },
  { from: "project:billing-service", to: "env:stripe-api-key", kind: "uses" },
  { from: "project:billing-service", to: "ssh:deploy-staging", kind: "uses" },
  { from: "project:billing-service", to: "database:billing", kind: "connects_to" },
  { from: "process:cargo-billing", to: "project:billing-service", kind: "runs_as" },
  { from: "process:cargo-billing", to: "port:8080", kind: "listens_on" },
  { from: "pm:cargo", to: "artifact:billing-target", kind: "produces" },

  { from: "database:billing", to: "docker:postgres-dev", kind: "connects_to" },
  { from: "docker:postgres-dev", to: "docker-image:postgres16", kind: "instantiated_from" },
  { from: "docker:postgres-dev", to: "docker-volume:pgdata", kind: "mounts" },
  { from: "docker:postgres-dev", to: "docker-network:devnet", kind: "attached_to" },
  { from: "docker:postgres-dev", to: "listener:postgres-5432", kind: "produces" },
  { from: "listener:postgres-5432", to: "port:5432", kind: "listens_on" },
  { from: "service:postgresql16", to: "port:5432", kind: "listens_on" },
  { from: "docker:redis-cache", to: "docker-image:redis7", kind: "instantiated_from" },
  { from: "docker:redis-cache", to: "docker-network:devnet", kind: "attached_to" },

  { from: "project:worker-queue", to: "repo:worker-queue", kind: "contains" },
  { from: "project:worker-queue", to: "runtime:python", kind: "uses" },
  { from: "project:worker-queue", to: "pm:pip", kind: "uses" },
  { from: "project:worker-queue", to: "config:worker-config", kind: "uses" },
  { from: "project:worker-queue", to: "docker:redis-cache", kind: "connects_to" },
];

// Kept separate from `resources` because the app's own cleanup engine
// produces `CleanupCandidate` records, not raw `Resource` records — see
// crates/discovery/src/cleanup.rs. `resource_id` below points back into
// `resources` above so the cleanup list and the graph/detail views agree
// with each other about what a given path actually is.
export const cleanupCandidates: CleanupCandidate[] = [
  {
    resource_id: "cache:pnpm-store",
    resource_kind: "cache",
    name: "pnpm store",
    path: "~/Library/pnpm/store",
    category: "cache",
    reasoning: "Package-manager cache, not read by any running process in this scan.",
    last_used: "2026-07-15T12:00:00Z",
    depended_on_by: [],
    size_bytes: 2_255_000_000,
    reversible: true,
    consequence: "The next install re-downloads packages from the registry.",
  },
  {
    resource_id: "artifact:billing-target",
    resource_kind: "build_artifact",
    name: "target/",
    path: "~/Developer/billing-service/target",
    category: "stale_build_artifact",
    reasoning: "Debug build output, older than the project's most recent commit.",
    last_used: "2026-07-02T16:20:00Z",
    depended_on_by: ["process:cargo-billing"],
    size_bytes: 1_504_000_000,
    reversible: true,
    consequence: "The next cargo build regenerates it. The running process listed above would need a rebuild first.",
  },
  {
    resource_id: "docker-image:node18-stale",
    resource_kind: "docker_image",
    name: "node:18-alpine",
    path: null,
    category: "unused_docker_image",
    reasoning: "No container on this machine is instantiated from this image.",
    last_used: "2026-01-05T10:00:00Z",
    depended_on_by: [],
    size_bytes: 187_000_000,
    reversible: true,
    consequence: "Removing it frees the image layer. Re-pulling it later costs one download.",
  },
  {
    resource_id: "docker-volume:old-pgdata-backup",
    resource_kind: "docker_volume",
    name: "old_pgdata_backup",
    path: null,
    category: "unused_docker_volume",
    reasoning: "Not mounted by any container in this scan.",
    last_used: "2026-01-10T09:00:00Z",
    depended_on_by: [],
    size_bytes: 671_000_000,
    reversible: false,
    consequence: "Docker volumes are deleted with their data. Confirm nothing still reads this backup before removing it.",
  },
  {
    resource_id: "disk:node-modules",
    resource_kind: "disk_usage_entry",
    name: "node_modules/",
    path: "~/Developer/api-gateway/node_modules",
    category: "large_dependency_tree",
    reasoning: "31,402 files, larger than 90% of dependency trees seen across this scan's projects.",
    last_used: "2026-08-10T09:00:00Z",
    depended_on_by: ["process:node-api-gateway"],
    size_bytes: 891_000_000,
    reversible: true,
    consequence: "The next pnpm install regenerates it from the lockfile. The running process listed above would need a restart first.",
  },
];

export const changeEvents: ChangeEvent[] = [
  {
    id: "change:1",
    resource_name: "worker-queue",
    resource_kind: "project",
    kind: "discovered",
    summary: "New project discovered under ~/Developer",
    occurred_at: "2026-05-27T11:02:00Z",
  },
  {
    id: "change:2",
    resource_name: "redis:7-alpine",
    resource_kind: "docker_container",
    kind: "modified",
    summary: "Container status changed: running to exited",
    occurred_at: "2026-06-30T09:00:00Z",
  },
  {
    id: "change:3",
    resource_name: "target/",
    resource_kind: "build_artifact",
    kind: "modified",
    summary: "Size grew from 0.9 GB to 1.4 GB since previous scan",
    occurred_at: "2026-07-02T16:20:00Z",
  },
  {
    id: "change:4",
    resource_name: "node:18-alpine",
    resource_kind: "docker_image",
    kind: "modified",
    summary: "Last referencing container removed; image now unused",
    occurred_at: "2026-08-10T09:00:00Z",
  },
  {
    id: "change:5",
    resource_name: "STRIPE_API_KEY",
    resource_kind: "environment_variable",
    kind: "discovered",
    summary: "New environment variable name observed in billing-service",
    occurred_at: "2026-08-19T10:02:00Z",
  },
];

export function resourceById(id: string): Resource | undefined {
  return resources.find((r) => r.id === id);
}

export function kindsPresent(): ResourceKind[] {
  return Array.from(new Set(resources.map((r) => r.kind)));
}
