# Privacy

CodeAtlas is a local-first application. This page describes exactly what
it does and does not do with your data, in plain terms.

## What CodeAtlas accesses

When you run a scan, CodeAtlas reads, on your own machine:

- Directory listings under the search roots you configure (by default,
  common code folders under your home directory: `Developer`,
  `Projects`, `code`, `src`, `workspace`, `repos`, filtered to whichever
  of those actually exist).
- Specific files inside those directories that identify a project
  (`package.json`, `Cargo.toml`, `go.mod`, and similar manifest files),
  and `.git` metadata for repositories it finds there.
- The operating system's process table and listening-socket table.
- Docker's container/image/volume/network metadata, if Docker is
  installed and running.
- Installed language runtime and package manager versions, detected by
  checking for known executable names on your `PATH`.
- `~/.ssh/config`, if present (host aliases and connection settings
  only — see `SECURITY.md` for exactly which fields).
- The names (not values) of environment variables in the process
  CodeAtlas runs as.

## What CodeAtlas never does

- **Never uploads anything.** There is no server component. CodeAtlas
  has no network client in its discovery or storage code at all.
- **Never collects telemetry by default.** No usage analytics, no crash
  reporting to a remote service, no update-check that reports back
  identifying information. If an opt-in telemetry feature is ever
  added, it will default to off and this document will be updated
  first.
- **Never reads file contents beyond what's needed to identify or
  describe a resource.** A project's source code is not read line by
  line; only specific manifest and config files are opened, and only to
  extract the specific fields described in `SECURITY.md`.
- **Never stores secret values.** Environment variable values, SSH
  private key contents, and credentials embedded in URLs are never
  written to CodeAtlas's database. See `SECURITY.md` for the mechanisms
  that enforce this.
- **Never requires an account.** There is no sign-up, no login, no
  cloud sync in the current release.

## Where your data lives

Everything CodeAtlas discovers is stored in a single SQLite database in
your operating system's standard application data directory (for
example, `~/Library/Application Support/com.levimackay.codeatlas` on
macOS). Nothing leaves that file unless you explicitly export or share
it yourself. Uninstalling CodeAtlas and deleting that directory removes
all data CodeAtlas has ever stored.

## Questions

Open a GitHub issue or email levibmackay@gmail.com.
