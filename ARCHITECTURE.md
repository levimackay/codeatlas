# Architecture

## Summary

CodeAtlas is a Tauri 2 desktop application. A Rust backend performs all
discovery, normalization, persistence, and graph construction. A React and
TypeScript frontend, rendered in the operating system's native webview,
presents that data. The two communicate over Tauri's IPC bridge (typed
commands and events), not a local HTTP server.

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript, native webview)           │
│  machine overview · project explorer · graph · search    │
│  cleanup center · timeline · command palette · settings  │
└───────────────────────┬───────────────────────────────────┘
                         │ Tauri IPC (commands + events)
┌───────────────────────▼───────────────────────────────────┐
│  Tauri shell (src-tauri)                                  │
│  command handlers · capability/permission config · tray   │
└───────────────────────┬───────────────────────────────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                    │                    │
┌────▼─────┐   ┌──────────▼─────────┐   ┌──────▼──────┐
│ discovery │   │        core         │   │     db      │
│  engine + │──▶│  domain model,      │◀──│  SQLite,    │
│ providers │   │  graph, snapshots   │   │  migrations │
└────┬─────┘   └─────────────────────┘   └─────────────┘
     │
┌────▼─────────────────────┐
│ platform abstraction      │
│ traits + per-OS impls     │
│ macOS · Linux · Windows   │
└────────────────────────────┘
```

## Why not Electron

Electron ships a full Chromium and Node.js runtime inside every install,
typically 100-150MB before the app's own code, and exposes Node's full
filesystem and process APIs to anything that can reach the renderer unless
the developer manually re-implements the isolation Tauri gives you by
default. CodeAtlas reads process lists, environment variables, SSH
configuration, and container metadata. That is precisely the kind of
application where a renderer-to-Node escape is not a hypothetical, it is
the whole attack surface. Tauri's webview has no Node bridge at all; the
frontend can only reach the backend through explicitly declared commands
with a capability manifest that enumerates exactly what each window is
allowed to call. There is no ambient access to grant.

## Why Tauri over pure native (Swift/AppKit, WinUI, GTK)

Three fully native codebases (Swift, C#, GTK or Qt) is a three times larger
surface to keep behaviorally identical, and it forecloses on code reuse for
the parts of this product that are inherently platform independent: the
domain model, the dependency graph, search, the SQLite layer, and most of
the discovery orchestration logic. Tauri lets that logic live once, in
Rust, shared unmodified across all three targets, while only the actual
platform-specific probes (process enumeration syscalls, port table
lookups, package manager locations) are written per OS behind a trait.
That is a genuine platform abstraction layer, not a lowest-common-denominator
compromise, because the parts that differ between operating systems are
exactly the parts CodeAtlas isolates behind `PlatformProvider` traits.

## Why Rust for the backend

Discovery work is inherently filesystem and syscall heavy: walking project
trees, reading process tables, parsing `/proc` or `sysctl` output, querying
Docker's local socket. This needs to run without blocking a UI thread, needs
to not leak memory across long-running background scans, and needs to
handle malformed or hostile input (a project's `package.json`, a
container's labels, a `.git/config`) without risking memory safety. Rust
gives us all three without a garbage collector's unpredictable pause
behavior, and its ownership model makes "never construct a shell command by
concatenating user-controlled strings" the natural way to write the code
rather than a discipline to maintain by hand.

## Why SQLite

The machine model and its history are inherently single-writer, single-user,
local data. SQLite via `rusqlite` needs no server process, ships inside the
binary, handles the write volume of a discovery engine comfortably with
WAL mode, and has a mature migration story. There is no multi-user or
networked access requirement that would justify anything heavier.

## Workspace layout

```
codeatlas/
  crates/
    core/        domain model: Resource, ResourceKind, Relationship, Graph,
                 Snapshot, ChangeEvent — no I/O, pure data + logic
    db/          SQLite schema, migrations, repositories
    platform/    PlatformProvider traits, capability reporting,
                 os-specific implementations behind cfg(target_os)
    discovery/   discovery engine, scan orchestration, individual
                 discovery providers (Git, Docker, Process, Port,
                 runtimes, package managers, filesystem, services)
    cli/         codeatlas-cli binary, reuses core/db/platform/discovery
  src-tauri/     Tauri application shell, IPC commands, capability manifest
  src/           React + TypeScript frontend (Vite)
  website/       marketing site, deployed independently of the app
  .github/       CI, Dependabot, CodeQL
```

Platform-specific code lives inside the single `platform` crate rather than
three separate crates. The trait boundary is what matters for the
abstraction to hold; splitting into per-OS crates would only add
publishing and versioning overhead without adding isolation, since cargo
already compiles out any `cfg(target_os = "...")` module that does not
match the build target.

## Discovery providers report capabilities

Every provider implements:

```rust
trait DiscoveryProvider {
    fn id(&self) -> &'static str;
    fn availability(&self, ctx: &PlatformContext) -> Availability;
    async fn scan(&self, ctx: &ScanContext) -> Result<Vec<DiscoveredResource>, ScanError>;
}

enum Availability {
    Available,
    Unavailable { reason: String },
}
```

The engine calls `availability()` before `scan()` and always runs the set
that reports `Available`. A provider that is not installed (Docker not
running, no `python3` on `PATH`) or not implemented for the current OS
degrades to `Unavailable` with a human-readable reason shown in the
diagnostics view. A panic or error inside one provider's `scan()` is
caught at the orchestration boundary and never aborts the others.

## Persistence and migrations

`db` owns a single `migrations/` directory of forward-only, numbered SQL
files applied through `rusqlite_migration`. Schema version is tracked in
`schema_migrations`. Upgrades apply new migrations without touching
existing rows; there is no destructive migration in the initial schema set,
and any future one will ship a data-preserving path or block the upgrade
with a clear error rather than silently drop data.

## Frontend

React 19 + TypeScript, built with Vite, styled without a heavyweight
component framework so the visual identity in `DESIGN.md` is not fighting
a design system's defaults. State that mirrors backend data (the machine
model, scan status) is fetched through typed Tauri command wrappers and
cached with TanStack Query, which gives us request deduplication and
background refetch without hand-rolled caching. The dependency graph view
renders with a canvas-based force layout rather than a DOM-per-node
library, since the graph can realistically have several hundred nodes and
DOM-based graph renderers degrade badly past a few dozen.

## CLI

`codeatlas-cli` is a thin binary over the same `discovery`, `core`, and
`db` crates the desktop app uses. It exists because a scriptable,
CI-friendly way to run a scan and query the resulting model (`codeatlas
scan`, `codeatlas ls processes`, `codeatlas graph project ./foo`) is a real
workflow for developers who want this in a terminal or a pre-commit hook,
not a checkbox feature. It shares the exact discovery and normalization
code the GUI uses, so results are identical.

## Security model

See `SECURITY.md` for the full threat model. In summary: least privilege,
no elevated process execution by default, all shell invocation through
`std::process::Command` with argument vectors (never a shell string),
strict path canonicalization before any filesystem operation, environment
variable values withheld from the UI and the database by default, and no
network access from the discovery engine at all.
