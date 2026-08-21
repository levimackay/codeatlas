# Contributing

CodeAtlas is a Rust workspace (the discovery engine, persistence layer,
and platform abstraction, plus the Tauri app shell and a CLI) with a
React/TypeScript frontend. This doc covers everything you need to build,
test, and contribute.

## Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain; see `rust-toolchain`
  version implied by `Cargo.toml`'s `rust-version`)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (`corepack enable` or `npm install -g pnpm`)
- Platform build dependencies for Tauri: see the
  [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)
  for your OS. On Linux you'll need `libwebkit2gtk-4.1-dev`,
  `libappindicator3-dev`, `librsvg2-dev`, and standard build tools.

## Getting started

```sh
git clone https://github.com/levimackay/codeatlas.git
cd codeatlas
pnpm install
```

## Running the app in development

```sh
pnpm tauri dev
```

This starts the Vite dev server and launches the native app shell with
hot reload on the frontend. Rust changes require a rebuild, which
`tauri dev` handles automatically (slower than a frontend-only change).

For local screenshots (visual QA, marketing material) there's also
`pnpm dev:demo` and `pnpm build:demo`, which serve the UI against a
static local fixture instead of a real Tauri backend — useful because
the app can't render outside a real Tauri window otherwise. These are
gated by `VITE_DEMO_MODE` and are never part of the shipped app; the
demo fixture is only wired in by a build-time Vite alias that these two
scripts set, so it's absent from `pnpm dev` and `pnpm build`.

## Running the CLI

```sh
cargo run -p codeatlas-cli -- scan
cargo run -p codeatlas-cli -- ls project
cargo run -p codeatlas-cli -- search postgres
```

## Testing

```sh
cargo test --workspace      # every Rust crate
pnpm test                   # frontend unit/component tests (vitest)
```

## Linting and formatting

```sh
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
pnpm lint
pnpm format
```

CI runs all of the above; a PR won't pass review with warnings from any
of them.

## Building

```sh
cargo build --workspace              # debug build of every crate
pnpm tauri build                     # production app bundle for your OS
cargo build -p codeatlas-cli --release
```

## Project structure

```
crates/core/        domain model: Resource, Graph, ChangeEvent, CleanupCandidate
crates/db/           SQLite persistence, migrations
crates/platform/     platform abstraction traits + per-OS implementations
crates/discovery/     discovery engine + individual providers
crates/cli/          codeatlas CLI binary
src-tauri/            Tauri app shell, IPC commands
src/                  React/TypeScript frontend
website/              marketing site (separate deploy, see website/README.md)
```

## Adding a discovery provider

Providers live in `crates/discovery/src/providers/`, one file per
provider. Look at `crates/discovery/src/providers/git.rs` for a complete
example: implement the `DiscoveryProvider` trait
(`crates/discovery/src/provider.rs`), register the provider in
`builtin_providers()` in `crates/discovery/src/providers/mod.rs`, and
write unit tests for any parsing logic.

Rules that apply to every provider, enforced in review:

- Any external process invocation uses `std::process::Command` with an
  explicit argument vector. Never build a shell string.
- A provider must never panic on malformed external input; return a
  `ProviderError` or skip the malformed record.
- A provider that finds nothing or can't run reports
  `Availability::Unavailable { reason }` rather than silently returning
  an empty result set, so the diagnostics view can explain the gap.
- Resources with a stable real-world identity (a project path, a
  container ID) use `Resource::identified(kind, name, discriminator)` so
  other providers can compute the same id and form relationships without
  coordinating at scan time. Resources with no such identity (a
  transient process) use `Resource::new`.
- See `SECURITY.md` for what counts as sensitive and how it must be
  handled.

## Adding a platform integration

Platform-specific code lives in `crates/platform/src/{macos,linux,windows}.rs`
behind the traits defined in `crates/platform/src/process.rs` and
`system.rs`. Add the trait method there first, then implement it for
each OS; a provider in `crates/discovery` should never contain a
`cfg(target_os = ...)` itself — that's a sign the platform abstraction
is missing something.

## Adding a UI component

Follow `DESIGN.md` for typography, color, and spacing tokens. Frontend
code lives in `src/`; see `src/lib/commands.ts` for the typed wrappers
around every Tauri IPC command — add a new command there, matching a
new `#[tauri::command]` in `src-tauri/src/commands.rs`, rather than
calling `invoke()` directly from a component.

## Release process

Tagging `vX.Y.Z` and pushing the tag triggers
`.github/workflows/release.yml`, which builds installers for macOS,
Linux, and Windows and attaches them to a GitHub Release. See
`CHANGELOG.md` for the format each release's notes should follow.

## Pull requests

- Keep PRs scoped to one change.
- Include tests for new behavior.
- `main` is protected: PRs require passing CI and at least one review
  before merge (see the repository's branch protection settings).
