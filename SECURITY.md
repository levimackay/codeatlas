# Security

CodeAtlas reads a lot of sensitive material by design: process lists,
environment variable names, SSH host configuration, Docker metadata,
project source trees. This document describes the threat model, what
the application does and does not do with that material, and how to
report a vulnerability.

## Reporting a vulnerability

Email **levibmackay@gmail.com** with a description of the issue and, if
possible, reproduction steps. Please do not open a public GitHub issue
for a security report until a fix is available. You should get an
acknowledgement within a few days; there is no bug bounty program at
this time.

## Threat model

**What CodeAtlas trusts:** the operating system's own reporting of its
process table, socket table, and filesystem, and the user's explicit
choice of which directories to scan.

**What CodeAtlas treats as untrusted input**, because it can contain
arbitrary content controlled by whoever wrote a given repository,
container image, or config file, not by the person running CodeAtlas:

- The contents of any file inside a scanned project (`package.json`,
  `Cargo.toml`, `.git/config`, and so on).
- Git repository metadata: commit messages, branch names, remote URLs,
  tags. These are rendered as plain text and are never interpreted as
  commands or executed.
- Docker metadata: container names, labels, image tags, environment
  declarations reported by `docker inspect`-style commands. Treated the
  same way: displayed, never executed, never used to construct another
  command.
- Process command lines. A process's argv can itself contain adversarial
  content (a process can name itself anything); CodeAtlas only ever
  displays a truncated, escaped preview and never re-executes anything
  derived from a process's reported command line.

**Design consequence:** every discovery provider that shells out to an
external tool (`git`, `docker`, `launchctl`, `systemctl`) does so with
`std::process::Command` and an explicit argument vector. Nothing in the
codebase builds a shell string by concatenating discovered content.
Nothing discovered from a scanned project, container, or process is ever
passed to a shell interpreter, `eval`, or a second process invocation.

## Least privilege

CodeAtlas runs as the logged-in user and requests no elevated
privileges. It does not run as root or Administrator, does not install
a background daemon, and does not request `sudo` for any built-in
scan. A future feature that genuinely requires elevated access (for
example, inspecting another user's processes) will prompt for elevation
at the point of use, scoped to that one operation, with an explanation
of why, rather than requesting broad privileges up front. No such
feature exists in the current release.

## Sensitive data handling

- **Environment variables:** only variable *names* are ever collected.
  Values are never read into a `Resource`, never persisted to the
  database, and never sent to the frontend. See
  `crates/discovery/src/providers/environment.rs`.
- **SSH configuration:** only `~/.ssh/config` is parsed, and only the
  `Host`, `HostName`, `User`, and `Port` directives. Private keys,
  `known_hosts`, and any other file under `~/.ssh/` are never opened.
- **Git remotes:** any userinfo component in a remote URL (a token or
  credential embedded as `https://TOKEN@host/...`) is stripped before
  the URL is stored or displayed. See `redact_credentials` in
  `crates/discovery/src/providers/git.rs`.
- **Process command lines:** truncated to a short preview (executable
  name plus one argument) before being stored; the full command line is
  never persisted. Truncation alone is not sufficient: a real scan
  during development surfaced an actual credential that had been passed
  as a command-line argument by an unrelated tool, landing inside the
  two-token preview. Every surviving token is now additionally passed
  through `redact_secret_like_token` (`crates/discovery/src/providers/process_ports.rs`)
  before storage, which redacts `KEY=VALUE`-shaped tokens with a
  credential-sounding key name, long bare `KEY=VALUE` pairs even without
  a recognized name, userinfo embedded in connection-string-style URLs,
  and long opaque tokens with no recognizable structure.
- **`ResourceKind::is_sensitive_by_default`:** kinds that are inherently
  about secrets (environment variables, SSH config entries) are flagged
  at the type level in `crates/core/src/resource.rs`, so any future code
  path that might display a resource's value has to deliberately opt in
  rather than accidentally leaking one.

## Local-first, no default telemetry

CodeAtlas does not phone home. There is no analytics SDK, no crash
reporter wired to a remote service, and no default network access from
the discovery engine at all. If telemetry is ever added, it will be
opt-in, off by default, and documented in `PRIVACY.md` before it ships,
not after.

## Path handling

Every filesystem operation canonicalizes and validates paths before use.
Directory walks (`walkdir`) do not follow symlinks by default in the
providers that size directories, which avoids both infinite loops from
cyclic symlinks and a walk unexpectedly escaping the intended root.
Search roots are explicit, user-controlled paths, never derived from
untrusted input (a project's config file cannot cause CodeAtlas to scan
a different directory than the ones configured).

## Cleanup safety

CodeAtlas never deletes anything itself in the current release. The
cleanup center (`crates/discovery/src/cleanup.rs`) only produces
recommendations with full evidence, size, and dependency information;
acting on a recommendation is a manual step outside the application.
When destructive cleanup actions are added, each one will require
explicit per-item confirmation and will refuse to hide a dependency
warning behind a bulk "clean everything" action.

## Dependency security

- `cargo audit` runs in CI against the Rust dependency graph.
- Dependabot is configured for `cargo`, `npm`, and GitHub Actions.
- CodeQL runs against the TypeScript/JavaScript frontend on every push
  to `main` and weekly on a schedule.

## Known limitations in this release

- Release builds are not code-signed (no Apple Developer ID, no Windows
  Authenticode certificate configured yet). Unsigned builds will trigger
  Gatekeeper/SmartScreen warnings. See `.github/workflows/release.yml`.
- Elevated-privilege discovery (inspecting processes owned by other
  users, for instance) is not implemented; CodeAtlas only sees what the
  current user's privileges already expose.
- `glib` (GHSA-wrw7-89jp-8q8g, medium severity, a soundness issue in
  `glib::VariantStrIter`'s iterator implementations) is pulled in
  transitively by Tauri's own GTK stack on Linux, pinned by `tauri`/
  `gtk`/`webkit2gtk`, not by anything in this repository's own
  `Cargo.toml`. CodeAtlas does not use `glib::VariantStrIter`. Tracked
  via Dependabot; will be picked up automatically once Tauri's upstream
  dependencies move past the affected range, not worked around with a
  manual version pin that could desync from the rest of the GTK stack.
