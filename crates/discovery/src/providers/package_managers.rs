use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Evidence, Resource, ResourceKind};
use std::process::Command;

/// Detects installed package managers by looking each one up on PATH and
/// reading its `--version` output. Like `RuntimeProvider`, the provider
/// itself always runs; a given manager not being installed is normal and
/// is skipped rather than treated as a failure. The candidate list is a
/// single cross-platform set with a handful of OS-specific binaries
/// added in via `cfg!(...)`, mirroring how
/// `codeatlas_platform::PlatformCapabilities` branches per OS without
/// duplicating the whole provider.
pub struct PackageManagerProvider;

#[async_trait]
impl DiscoveryProvider for PackageManagerProvider {
    fn id(&self) -> &'static str {
        "package_managers"
    }

    fn label(&self) -> &'static str {
        "Package managers"
    }

    fn availability(&self, _ctx: &ScanContext) -> Availability {
        Availability::Available
    }

    async fn scan(&self, _ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        tokio::task::spawn_blocking(scan_blocking)
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

/// The binaries checked for on this platform, in report order.
fn candidate_binaries() -> Vec<&'static str> {
    let mut names = vec!["npm", "pnpm", "yarn", "bun", "pip3", "cargo", "brew"];

    if cfg!(target_os = "linux") {
        names.push("apt");
        names.push("dpkg");
    }
    if cfg!(target_os = "windows") {
        names.push("winget");
        names.push("choco");
    }

    names
}

fn scan_blocking() -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    for name in candidate_binaries() {
        let path = match which::which(name) {
            Ok(path) => path,
            // Not every developer machine has every manager installed;
            // that is the expected, common case, not an error.
            Err(_) => continue,
        };
        let path_display = path.display().to_string();

        let version_line = Command::new(&path)
            .arg("--version")
            .output()
            .ok()
            .and_then(|out| pick_version_text(&out.stdout, &out.stderr));

        let mut resource = Resource::identified(ResourceKind::PackageManager, name, &path_display)
            .with_path(path_display.clone())
            .with_evidence(Evidence {
                source: "package_managers".to_string(),
                description: format!("found `{name}` on PATH and read its --version output"),
                path: Some(path_display),
            });

        if let Some(line) = &version_line {
            resource = resource.with_attribute("version_output", line);
        }

        output.resources.push(resource);
    }

    Ok(output)
}

/// Picks the first non-empty line out of stdout, falling back to
/// stderr, mirroring the split some of these tools use between the two
/// streams for `--version` output. Only ever used as display text.
fn pick_version_text(stdout: &[u8], stderr: &[u8]) -> Option<String> {
    first_non_empty_line(stdout).or_else(|| first_non_empty_line(stderr))
}

fn first_non_empty_line(bytes: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(bytes);
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn candidate_list_includes_core_managers_everywhere() {
        let names = candidate_binaries();
        for expected in ["npm", "pnpm", "yarn", "bun", "pip3", "cargo", "brew"] {
            assert!(
                names.contains(&expected),
                "expected {expected} in {names:?}"
            );
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn candidate_list_includes_linux_managers() {
        let names = candidate_binaries();
        assert!(names.contains(&"apt"));
        assert!(names.contains(&"dpkg"));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn candidate_list_includes_windows_managers() {
        let names = candidate_binaries();
        assert!(names.contains(&"winget"));
        assert!(names.contains(&"choco"));
    }

    #[cfg(not(target_os = "linux"))]
    #[test]
    fn candidate_list_excludes_linux_managers_elsewhere() {
        let names = candidate_binaries();
        assert!(!names.contains(&"apt"));
        assert!(!names.contains(&"dpkg"));
    }

    #[test]
    fn picks_stdout_when_present() {
        assert_eq!(
            pick_version_text(b"npm 10.2.4\n", b""),
            Some("npm 10.2.4".to_string())
        );
    }

    #[test]
    fn falls_back_to_stderr_when_stdout_is_empty() {
        assert_eq!(
            pick_version_text(b"", b"Homebrew 4.1.11\n"),
            Some("Homebrew 4.1.11".to_string())
        );
    }

    #[test]
    fn returns_none_when_both_streams_are_empty() {
        assert_eq!(pick_version_text(b"", b""), None);
    }

    #[test]
    fn parses_multi_line_dpkg_style_output_by_taking_first_line() {
        let raw = b"Debian dpkg package management program version 1.21.1 (amd64).\n\nThis is free software...\n";
        assert_eq!(
            pick_version_text(raw, b""),
            Some("Debian dpkg package management program version 1.21.1 (amd64).".to_string())
        );
    }
}
