# SOURCES: CodeAtlas marketing website

Every figure and quoted claim on this site, and where it came from. Every
`data-source="<key>"` in `index.html` has a matching `## <key>` section
below. Nothing on this list is invented; everything is quoted or closely
paraphrased from the CodeAtlas repository's own docs, dated to this build.

The interactive demos (dependency graph, project detail pane, cleanup
center, CLI transcript output) are fed by an entirely fabricated sample
fixture (`src/data/sample-fixture.ts`) and are labeled "sample data"
directly in the markup, not marked with `data-source`, because they are
not claims about a real machine.

---

## resourcekind-count

- **Claim:** CodeAtlas's `Resource` model has 21 `ResourceKind` values.
- **Where it came from:** `src/lib/types.ts` in the CodeAtlas repository, the
  `ResourceKind` union type, counted directly.
- **Supplied by:** Repository source, read at build time.
- **Date:** 2026-08-21

## privacy-no-upload

- **Claim:** "There is no server component. CodeAtlas has no network
  client in its discovery or storage code at all."
- **Where it came from:** `PRIVACY.md`, "What CodeAtlas never does."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## privacy-no-telemetry

- **Claim:** No usage analytics, no crash reporting to a remote service,
  no identifying update-check; an opt-in telemetry feature would default
  off and the doc would be updated first.
- **Where it came from:** `PRIVACY.md`, "What CodeAtlas never does."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## privacy-no-account

- **Claim:** No sign-up, no login, no cloud sync in the current release.
- **Where it came from:** `PRIVACY.md`, "What CodeAtlas never does."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## privacy-storage

- **Claim:** Everything CodeAtlas discovers is stored in a single SQLite
  database in the OS's standard application data directory; nothing
  leaves that file unless the user exports or shares it.
- **Where it came from:** `PRIVACY.md`, "Where your data lives."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## security-env-names

- **Claim:** Only environment variable *names* are ever collected; values
  are never read into a `Resource`, never persisted, never sent to the
  frontend.
- **Where it came from:** `SECURITY.md`, "Sensitive data handling."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## security-ssh-fields

- **Claim:** Only `Host`, `HostName`, `User`, and `Port` are parsed from
  `~/.ssh/config`; private keys and `known_hosts` are never opened.
- **Where it came from:** `SECURITY.md`, "Sensitive data handling."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## security-git-redact

- **Claim:** Any userinfo token embedded in a git remote URL is stripped
  before the URL is stored or displayed.
- **Where it came from:** `SECURITY.md`, "Sensitive data handling,"
  referencing `redact_credentials` in
  `crates/discovery/src/providers/git.rs`.
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## security-cmdline

- **Claim:** Process command lines are truncated to a short preview
  before storage; a real scan during development surfaced a credential
  passed as a command-line argument by an unrelated tool inside that
  preview, so every surviving token is additionally checked against a
  secret-shaped pattern (`redact_secret_like_token`) before storage.
- **Where it came from:** `SECURITY.md`, "Sensitive data handling."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## platform-status

- **Claim:** macOS has been run and verified against real system data.
  Linux and Windows platform code compiles and is unit-tested but has not
  yet been run end-to-end against a real machine.
- **Where it came from:** `README.md`, "Supported platforms," and
  `ROADMAP.md`, "Known limitations in this release."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21
- **Notes:** Re-check against `ROADMAP.md` before shipping if this build
  lands after further platform testing has occurred.

## diskusage-timing

- **Claim:** On the author's own `~/Developer` with 79 projects, the
  disk-usage provider is the slowest single provider, observed around 15
  to 20 seconds; it does not block other providers, which run
  concurrently, but it sets the floor for total scan time.
- **Where it came from:** `ROADMAP.md`, "Known limitations in this
  release."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## readme-cli

- **Claim:** CodeAtlas ships a scriptable CLI, `codeatlas`, built from the
  same discovery engine the desktop app uses.
- **Where it came from:** `README.md`, "The CLI."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## readme-license

- **Claim:** CodeAtlas is dual-licensed under MIT or Apache License 2.0;
  Apache-2.0 adds an explicit patent grant, which matters for software
  that inspects a machine's installed toolchains and containers, and this
  is the convention most of the Rust ecosystem uses.
- **Where it came from:** `README.md`, "License."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## ci-facts

- **Claim:** CI runs a Rust + frontend lint/test/build matrix, CodeQL
  against the TypeScript/JavaScript frontend on push to main and weekly,
  `cargo audit` against the Rust dependency graph, and Dependabot is
  configured for cargo, npm, and GitHub Actions.
- **Where it came from:** `README.md` badges section and "Roadmap";
  `SECURITY.md`, "Dependency security."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21

## readme-unsigned-builds

- **Claim:** Release builds are currently unsigned (no Apple Developer ID
  or Windows code-signing certificate configured yet), so macOS will show
  an "unidentified developer" Gatekeeper warning and Windows will show a
  SmartScreen warning on first launch.
- **Where it came from:** `README.md`, "Installation," and `SECURITY.md`,
  "Known limitations in this release."
- **Supplied by:** Repository source.
- **Date:** 2026-08-21
- **Notes:** Remove or update the moment signing is added; tracked as an
  open placeholder in `DESIGN.md`.
