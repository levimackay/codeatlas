# Roadmap

This reflects what's actually built versus what's planned. If something
below isn't marked done, it isn't implemented yet, regardless of how
central it sounds to the product.

## Shipped

- Discovery engine with independent, panic-isolated providers:
  projects (marker-file + `.git` detection), git repositories (branch,
  status, recent commits, redacted remote URL), processes and listening
  ports, Docker containers/images/volumes/networks, language runtimes
  (Node, Python, Go, Rust, Ruby, Java, .NET), package managers (npm,
  pnpm, yarn, bun, pip, cargo, Homebrew, apt/dpkg, winget/choco), disk
  usage (caches and build artifacts, sized and dated), OS services
  (launchd on macOS, systemd user units on Linux), environment variable
  names (values never collected), SSH host aliases from `~/.ssh/config`.
- Deterministic cross-provider resource identity, so relationships
  (project contains repo, container instantiated from image, and so on)
  form correctly even though providers run independently.
- Local SQLite persistence with migrations, scan history, and a diffed
  change timeline.
- Cleanup recommendation engine, generic across resource kinds, with
  evidence, size, last-used time, dependents, and consequence text.
  Never deletes anything itself.
- Cross-platform platform abstraction layer for process/port/system
  info (macOS, Linux, Windows all compile; only macOS has been run and
  verified against real data so far — see Known limitations).
- `codeatlas` CLI: `scan`, `ls`, `search`, `changes`, `scans`.
- Tauri 2 desktop app shell with a typed IPC command layer.
- CI (Rust + frontend lint/test/build matrix, CodeQL, `cargo audit`),
  Dependabot, and a release workflow that builds installers for macOS
  (arm64 + x64), Linux, and Windows on a tag push.

## In progress

- Desktop UI: machine overview, project explorer, dependency graph,
  search, command palette, cleanup center, timeline, settings,
  onboarding. See `DESIGN.md` for the direction it's being built to.
- Marketing website.

## Planned, not started

- **Environment snapshots**: exporting a machine's runtime/tool/package
  inventory (never secrets) as a portable file, and the reverse
  (comparing a snapshot against the current machine). The data model
  already has everything needed to build the export half; restoring a
  snapshot onto a new machine is a larger effort tracked separately.
- **Git submodule support** in the git provider (currently out of
  scope — a repository's submodules aren't walked as separate
  repositories).
- **Docker bind-mount relationships**: the Docker provider currently
  links containers to named volumes only; bind mounts would need a
  per-container `docker inspect` call the provider deliberately avoids
  today to keep scan time bounded.
- **Windows service discovery**: `services.rs` reports
  `Availability::Unavailable` on Windows rather than a partial or fake
  implementation.
- **Ranked full-text search**: the current search is a plain SQL
  `LIKE` query; a proper ranked index (SQLite FTS5 or similar) is worth
  it once result volume on a large machine makes ranking matter.
- **Elevated-privilege discovery** (inspecting another user's
  processes, system-scoped services beyond the current user session):
  not implemented; would require an explicit, scoped elevation prompt
  per `SECURITY.md`'s least-privilege principle, not a broad admin
  request at launch.
- **Code-signed releases**: release builds are currently unsigned (no
  Apple Developer ID or Windows Authenticode certificate configured).
  See `SECURITY.md` and `.github/workflows/release.yml`.

## Known limitations in this release

- The disk usage provider walks and sizes cache/build-artifact
  directories synchronously per scan; on a machine with very large
  `node_modules`/`target` trees this is the slowest single provider
  (observed around 15-20 seconds against a real `~/Developer` with 79
  projects on this machine). It does not block other providers (they
  run concurrently), but it does set the floor for total scan time.
  Incremental/cached sizing is a candidate optimization if this proves
  too slow on larger machines.
- Linux and Windows platform code compiles and is unit-tested for its
  parsing logic, but has not yet been run end-to-end against a real
  Linux or Windows machine. macOS is the only platform verified against
  real, live system data so far.
