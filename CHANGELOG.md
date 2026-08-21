# Changelog

All notable changes to this project are documented in this file. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial discovery engine: projects, git repositories, processes,
  listening ports, Docker resources, language runtimes, package
  managers, disk usage (caches and build artifacts), OS services,
  environment variable names, and SSH host configuration.
- Local SQLite persistence with scan history and a change timeline.
- Cleanup center recommendations, generic across resource kinds, with
  evidence, size, and dependency information for every candidate.
- Cross-platform platform abstraction layer (macOS, Linux, Windows).
- Desktop app shell (Tauri 2 + React + TypeScript).
- `codeatlas` CLI (`scan`, `ls`, `search`, `changes`, `scans`).
- CI: Rust and frontend lint/test/build matrix, CodeQL, Dependabot,
  `cargo audit`.

[Unreleased]: https://github.com/levimackay/codeatlas/commits/main
