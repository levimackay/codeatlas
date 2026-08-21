use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Evidence, Resource, ResourceKind};
use std::process::Command;

/// Detects installed language runtimes by looking each one up on PATH
/// and reading its `--version` output. The provider itself always runs
/// (there is nothing about the environment that would make it
/// unavailable); an individual runtime simply not being installed is the
/// normal case, not a scan failure, so it is skipped rather than
/// reported as an error.
pub struct RuntimeProvider;

/// Binaries checked for, in report order. `rustc` is included even
/// though CodeAtlas itself is built with Rust: the provider still has to
/// discover it like anything else, it is simply guaranteed to be found
/// in any environment that could compile CodeAtlas from source.
const RUNTIME_BINARIES: &[&str] = &["node", "python3", "go", "rustc", "ruby", "java", "dotnet"];

#[async_trait]
impl DiscoveryProvider for RuntimeProvider {
    fn id(&self) -> &'static str {
        "runtimes"
    }

    fn label(&self) -> &'static str {
        "Language runtimes"
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

fn scan_blocking() -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    for &name in RUNTIME_BINARIES {
        let path = match which::which(name) {
            Ok(path) => path,
            // Not installed is the ordinary case for most of this list
            // on most machines; nothing to report, nothing to fail.
            Err(_) => continue,
        };
        let path_display = path.display().to_string();

        // `java -version` and some `python3 --version` builds write to
        // stderr instead of stdout, so both streams are captured and
        // the first one with content wins.
        let version_line = Command::new(&path)
            .arg("--version")
            .output()
            .ok()
            .and_then(|out| pick_version_text(&out.stdout, &out.stderr));

        let mut resource = Resource::identified(ResourceKind::Runtime, name, &path_display)
            .with_path(path_display.clone())
            .with_evidence(Evidence {
                source: "runtimes".to_string(),
                description: format!("found `{name}` on PATH and read its --version output"),
                path: Some(path_display),
            });

        if let Some(line) = &version_line {
            resource = resource.with_attribute("version_output", line);
            if let Some(number) = extract_version_number(line) {
                resource = resource.with_attribute("version", number);
            }
        }

        output.resources.push(resource);
    }

    Ok(output)
}

/// Picks the first non-empty line out of stdout, falling back to
/// stderr. `--version` output is untrusted text either way: it is only
/// ever stored for display, never parsed as anything but a version
/// number extraction below.
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

/// Pulls the first dotted version number out of a free-form `--version`
/// string ("go version go1.21.0 darwin/arm64" -> "1.21.0", "Python
/// 3.11.4" -> "3.11.4"). Returns `None` rather than guessing when no
/// such token is present.
fn extract_version_number(raw: &str) -> Option<String> {
    let chars: Vec<char> = raw.chars().collect();
    let len = chars.len();
    let mut i = 0;
    while i < len {
        if chars[i].is_ascii_digit() {
            let start = i;
            let mut j = i;
            let mut dot_count = 0;
            while j < len && (chars[j].is_ascii_digit() || chars[j] == '.') {
                if chars[j] == '.' {
                    dot_count += 1;
                }
                j += 1;
            }
            let mut end = j;
            while end > start && chars[end - 1] == '.' {
                end -= 1;
            }
            if dot_count >= 1 && end > start {
                let candidate: String = chars[start..end].iter().collect();
                if candidate.contains('.') {
                    return Some(candidate);
                }
            }
            i = j.max(i + 1);
        } else {
            i += 1;
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_version_from_node_style_output() {
        assert_eq!(
            extract_version_number("v20.11.0"),
            Some("20.11.0".to_string())
        );
    }

    #[test]
    fn extracts_version_from_go_style_output() {
        assert_eq!(
            extract_version_number("go version go1.21.0 darwin/arm64"),
            Some("1.21.0".to_string())
        );
    }

    #[test]
    fn extracts_version_from_python_style_output() {
        assert_eq!(
            extract_version_number("Python 3.11.4"),
            Some("3.11.4".to_string())
        );
    }

    #[test]
    fn extracts_version_from_rustc_style_output() {
        assert_eq!(
            extract_version_number("rustc 1.75.0 (82e1608df 2023-12-21)"),
            Some("1.75.0".to_string())
        );
    }

    #[test]
    fn extracts_version_from_java_style_output() {
        assert_eq!(
            extract_version_number("openjdk version \"17.0.2\" 2022-01-18"),
            Some("17.0.2".to_string())
        );
    }

    #[test]
    fn extracts_version_from_dotnet_style_output() {
        assert_eq!(
            extract_version_number("8.0.100"),
            Some("8.0.100".to_string())
        );
    }

    #[test]
    fn returns_none_when_no_version_token_present() {
        assert_eq!(extract_version_number("command not found"), None);
    }

    #[test]
    fn picks_stdout_when_present() {
        assert_eq!(
            pick_version_text(b"v20.11.0\n", b""),
            Some("v20.11.0".to_string())
        );
    }

    #[test]
    fn falls_back_to_stderr_when_stdout_is_empty() {
        assert_eq!(
            pick_version_text(b"", b"openjdk version \"17.0.2\" 2022-01-18\n"),
            Some("openjdk version \"17.0.2\" 2022-01-18".to_string())
        );
    }

    #[test]
    fn returns_none_when_both_streams_are_empty() {
        assert_eq!(pick_version_text(b"", b""), None);
        assert_eq!(pick_version_text(b"\n\n  \n", b"\n"), None);
    }

    #[test]
    fn runtime_binaries_list_is_the_documented_set() {
        assert_eq!(
            RUNTIME_BINARIES,
            &["node", "python3", "go", "rustc", "ruby", "java", "dotnet"]
        );
    }
}
