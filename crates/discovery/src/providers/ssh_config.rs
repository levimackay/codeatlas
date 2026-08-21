use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Evidence, Resource, ResourceKind};
use std::path::{Path, PathBuf};

/// Parses `~/.ssh/config` for `Host` aliases and their `HostName`,
/// `User`, and `Port` directives. This is the only file this provider
/// ever opens: it never lists `~/.ssh/` itself, and never touches
/// identity files, private keys, or `known_hosts`. Everything captured
/// (a host alias, a hostname, a username, a port number) is a value the
/// user already wrote in plaintext to configure SSH — none of it is
/// secret material, unlike the key files that live alongside it.
///
/// `ResourceKind::SshConfigEntry` is marked `is_sensitive_by_default()`
/// in `codeatlas_core::resource` as a UI-display caution (host topology
/// can still be sensitive to show by default), not because this provider
/// reads anything secret.
pub struct SshConfigProvider;

#[async_trait]
impl DiscoveryProvider for SshConfigProvider {
    fn id(&self) -> &'static str {
        "ssh_config"
    }

    fn label(&self) -> &'static str {
        "SSH configuration"
    }

    fn availability(&self, ctx: &ScanContext) -> Availability {
        if ssh_config_path(ctx).is_file() {
            Availability::Available
        } else {
            Availability::Unavailable {
                reason: "no ~/.ssh/config found".to_string(),
            }
        }
    }

    async fn scan(&self, ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        let path = ssh_config_path(ctx);
        tokio::task::spawn_blocking(move || scan_blocking(&path))
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

fn ssh_config_path(ctx: &ScanContext) -> PathBuf {
    ctx.home_dir.join(".ssh").join("config")
}

fn scan_blocking(path: &Path) -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    let contents = match std::fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(_) => return Ok(output),
    };

    let path_display = path.display().to_string();
    for entry in parse_ssh_config(&contents) {
        let discriminator = format!("{path_display}#{}", entry.alias);
        let mut resource = Resource::identified(
            ResourceKind::SshConfigEntry,
            entry.alias.clone(),
            &discriminator,
        )
        .with_evidence(Evidence {
            source: "ssh_config".to_string(),
            description: "parsed Host block in ~/.ssh/config".to_string(),
            path: Some(path_display.clone()),
        });

        if let Some(hostname) = entry.hostname {
            resource = resource.with_attribute("hostname", hostname);
        }
        if let Some(user) = entry.user {
            resource = resource.with_attribute("user", user);
        }
        if let Some(port) = entry.port {
            resource = resource.with_attribute("port", port);
        }

        output.resources.push(resource);
    }

    Ok(output)
}

#[derive(Debug, PartialEq, Eq)]
struct SshHostEntry {
    alias: String,
    hostname: Option<String>,
    user: Option<String>,
    port: Option<u16>,
}

/// Line-based parser for the subset of SSH config syntax this provider
/// cares about. SSH config directives are `Keyword value...`, optionally
/// separated by `=`, one per line, with `#` starting a comment. A `Host`
/// line can name multiple space-separated aliases (patterns); each gets
/// its own entry, and `HostName`/`User`/`Port` directives that follow
/// apply to all aliases in the most recently seen `Host` line until the
/// next one. Malformed or unrecognized lines are skipped, never treated
/// as an error.
fn parse_ssh_config(contents: &str) -> Vec<SshHostEntry> {
    let mut entries: Vec<SshHostEntry> = Vec::new();
    let mut current_indices: Vec<usize> = Vec::new();

    for raw_line in contents.lines() {
        let line = strip_comment(raw_line).trim();
        if line.is_empty() {
            continue;
        }

        let Some((keyword, rest)) = split_directive(line) else {
            continue;
        };
        let keyword_lower = keyword.to_ascii_lowercase();

        match keyword_lower.as_str() {
            "host" => {
                current_indices.clear();
                for alias in rest.split_whitespace() {
                    // Wildcard-only patterns aren't a concrete host worth
                    // surfacing as a resource.
                    if alias == "*" {
                        continue;
                    }
                    let index = entries.len();
                    entries.push(SshHostEntry {
                        alias: alias.to_string(),
                        hostname: None,
                        user: None,
                        port: None,
                    });
                    current_indices.push(index);
                }
            }
            "hostname" => {
                let value = rest.trim().to_string();
                if !value.is_empty() {
                    for &index in &current_indices {
                        entries[index].hostname = Some(value.clone());
                    }
                }
            }
            "user" => {
                let value = rest.trim().to_string();
                if !value.is_empty() {
                    for &index in &current_indices {
                        entries[index].user = Some(value.clone());
                    }
                }
            }
            "port" => {
                if let Ok(port) = rest.trim().parse::<u16>() {
                    for &index in &current_indices {
                        entries[index].port = Some(port);
                    }
                }
            }
            _ => {}
        }
    }

    entries
}

fn strip_comment(line: &str) -> &str {
    match line.find('#') {
        Some(idx) => &line[..idx],
        None => line,
    }
}

/// Splits a directive line into its keyword and the rest, on the first
/// run of whitespace or a literal `=`, both of which SSH config accepts
/// as the separator.
fn split_directive(line: &str) -> Option<(&str, &str)> {
    let line = line.trim();
    let split_at = line.find(|c: char| c.is_whitespace() || c == '=')?;
    let keyword = &line[..split_at];
    let rest = line[split_at..]
        .trim_start_matches(|c: char| c.is_whitespace() || c == '=')
        .trim();
    if keyword.is_empty() {
        None
    } else {
        Some((keyword, rest))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn parses_host_hostname_user_and_port() {
        let contents = r#"
# a comment
Host prod
    HostName prod.example.com
    User deploy
    Port 2222

Host staging
    HostName staging.example.com
    User ci
"#;
        let entries = parse_ssh_config(contents);
        assert_eq!(entries.len(), 2);

        let prod = entries.iter().find(|e| e.alias == "prod").unwrap();
        assert_eq!(prod.hostname.as_deref(), Some("prod.example.com"));
        assert_eq!(prod.user.as_deref(), Some("deploy"));
        assert_eq!(prod.port, Some(2222));

        let staging = entries.iter().find(|e| e.alias == "staging").unwrap();
        assert_eq!(staging.hostname.as_deref(), Some("staging.example.com"));
        assert_eq!(staging.user.as_deref(), Some("ci"));
        assert_eq!(staging.port, None);
    }

    #[test]
    fn skips_wildcard_only_host_and_malformed_lines() {
        let contents = "Host *\n    User should-not-apply\nthis is nonsense\nHost real\n    HostName real.example.com\n";
        let entries = parse_ssh_config(contents);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].alias, "real");
    }

    #[test]
    fn handles_multiple_aliases_on_one_host_line() {
        let contents = "Host a b\n    HostName shared.example.com\n";
        let entries = parse_ssh_config(contents);
        assert_eq!(entries.len(), 2);
        assert!(entries
            .iter()
            .all(|e| e.hostname.as_deref() == Some("shared.example.com")));
    }

    #[tokio::test]
    async fn scan_reads_config_and_produces_resources() {
        let home = tempdir().unwrap();
        let ssh_dir = home.path().join(".ssh");
        std::fs::create_dir_all(&ssh_dir).unwrap();
        std::fs::write(
            ssh_dir.join("config"),
            "Host myserver\n    HostName 10.0.0.5\n    User levi\n    Port 22\n",
        )
        .unwrap();

        let ctx = ScanContext::new(home.path().to_path_buf(), vec![]);
        assert_eq!(
            SshConfigProvider.availability(&ctx),
            Availability::Available
        );

        let output = SshConfigProvider.scan(&ctx).await.unwrap();
        assert_eq!(output.resources.len(), 1);
        let resource = &output.resources[0];
        assert_eq!(resource.name, "myserver");
        assert_eq!(resource.kind, ResourceKind::SshConfigEntry);
        assert_eq!(
            resource.attributes.get("hostname").and_then(|v| v.as_str()),
            Some("10.0.0.5")
        );
        assert_eq!(
            resource.attributes.get("user").and_then(|v| v.as_str()),
            Some("levi")
        );
        assert_eq!(
            resource.attributes.get("port").and_then(|v| v.as_u64()),
            Some(22)
        );
    }

    #[tokio::test]
    async fn unavailable_when_no_config_file_exists() {
        let home = tempdir().unwrap();
        let ctx = ScanContext::new(home.path().to_path_buf(), vec![]);
        assert_eq!(
            SshConfigProvider.availability(&ctx),
            Availability::Unavailable {
                reason: "no ~/.ssh/config found".to_string()
            }
        );
    }
}
